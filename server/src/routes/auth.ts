/**
 * Auth routes — Access token + Refresh token flow
 *
 * Access token  → short-lived JWT (15 min), returned in JSON response body
 * Refresh token → long-lived opaque token (7 days), stored as HttpOnly cookie
 *                 A bcrypt hash of it is persisted in the DB for rotation/revocation
 *
 * POST /auth/register   → { accessToken, user }  + sets refresh cookie
 * POST /auth/login      → { accessToken, user }  + sets refresh cookie
 * POST /auth/refresh    → { accessToken }         + rotates refresh cookie
 * POST /auth/logout     → revokes token           + clears cookie
 * GET  /auth/me         → { user }                (requires access token)
 * PATCH /auth/complete-profile → { user }         (requires access token)
 */

import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { env } from '../lib/env.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refresh_token'
const REFRESH_EXPIRES_MS = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN)

// ── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

const completeProfileSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Enter a valid WhatsApp number with country code (e.g. +919876543210)'),
  neighborhood: z.string().min(2).max(120),
})

// ── User select fields (reused across routes) ─────────────────────────────────

const USER_SELECT = {
  id:                   true,
  name:                 true,
  email:                true,
  role:                 true,
  avatarUrl:            true,
  bio:                  true,
  phone:                true,
  neighborhood:         true,
  phoneVerified:        true,
  emailVerified:        true,
  governmentIdVerified: true,
  createdAt:            true,
} as const

// ── Routes ────────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /register ─────────────────────────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { name, email, password } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.code(409).send({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: USER_SELECT,
    })

    const accessToken  = signAccessToken(fastify, user)
    const refreshToken = await createRefreshToken(user.id)

    setRefreshCookie(reply, refreshToken)
    return reply.code(201).send({ accessToken, user })
  })

  // ── POST /login ────────────────────────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { email, password } = body.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const accessToken  = signAccessToken(fastify, user)
    const refreshToken = await createRefreshToken(user.id)

    setRefreshCookie(reply, refreshToken)
    return reply.send({
      accessToken,
      user: {
        id:                   user.id,
        name:                 user.name,
        email:                user.email,
        role:                 user.role,
        avatarUrl:            user.avatarUrl,
        bio:                  user.bio,
        phone:                user.phone,
        neighborhood:         user.neighborhood,
        phoneVerified:        user.phoneVerified,
        emailVerified:        user.emailVerified,
        governmentIdVerified: user.governmentIdVerified,
      },
    })
  })

  // ── POST /refresh ──────────────────────────────────────────────────────────
  // Client sends no body — the HttpOnly cookie is forwarded automatically.
  // Returns a new access token and rotates the refresh token (old one revoked).
  fastify.post('/refresh', async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE]
    if (!rawToken) return reply.code(401).send({ error: 'No refresh token' })

    // Find a matching, non-revoked, non-expired token record
    const record = await findRefreshToken(rawToken)
    if (!record) {
      clearRefreshCookie(reply)
      return reply.code(401).send({ error: 'Invalid or expired refresh token' })
    }

    // Revoke the used token (rotation — one-time use)
    await prisma.refreshToken.update({
      where: { id: record.id },
      data:  { revokedAt: new Date() },
    })

    // Issue new pair
    const user = await prisma.user.findUnique({
      where:  { id: record.userId },
      select: USER_SELECT,
    })
    if (!user) {
      clearRefreshCookie(reply)
      return reply.code(401).send({ error: 'User not found' })
    }

    const accessToken     = signAccessToken(fastify, user)
    const newRefreshToken = await createRefreshToken(user.id)

    setRefreshCookie(reply, newRefreshToken)
    return reply.send({ accessToken })
  })

  // ── POST /logout ───────────────────────────────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE]
    if (rawToken) {
      const record = await findRefreshToken(rawToken)
      if (record) {
        await prisma.refreshToken.update({
          where: { id: record.id },
          data:  { revokedAt: new Date() },
        })
      }
    }
    clearRefreshCookie(reply)
    return reply.send({ ok: true })
  })

  // ── GET /me ────────────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where:  { id: request.user.sub },
      select: USER_SELECT,
    })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send(user)
  })

  // ── PATCH /complete-profile ────────────────────────────────────────────────
  fastify.patch(
    '/complete-profile',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = completeProfileSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

      const { phone, neighborhood } = body.data
      const user = await prisma.user.update({
        where:  { id: request.user.sub },
        data:   { phone, neighborhood },
        select: USER_SELECT,
      })
      return reply.send(user)
    },
  )
}

export default authRoutes

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sign a short-lived access token using the Fastify JWT instance. */
function signAccessToken(
  fastify: Parameters<FastifyPluginAsync>[0],
  user: { id: string; email: string; role: string },
): string {
  return fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role })
}

/**
 * Generate a cryptographically random refresh token, hash it, and persist it.
 * Returns the raw (unhashed) token to be sent to the client.
 */
async function createRefreshToken(userId: string): Promise<string> {
  const raw    = crypto.randomBytes(48).toString('hex') // 96-char hex string
  const prefix = raw.slice(0, 16)                       // fast lookup key
  const hash   = await bcrypt.hash(raw, 10)
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS)

  await prisma.refreshToken.create({
    data: { tokenHash: hash, tokenPrefix: prefix, userId, expiresAt },
  })

  return raw
}

/**
 * Find a valid (non-revoked, non-expired) refresh token record.
 *
 * Uses tokenPrefix for an indexed lookup (O(1) DB query) then bcrypt-verifies
 * the single matching candidate — no full-table scan.
 */
async function findRefreshToken(raw: string) {
  const prefix = raw.slice(0, 16)

  const candidates = await prisma.refreshToken.findMany({
    where: {
      tokenPrefix: prefix,
      revokedAt:   null,
      expiresAt:   { gt: new Date() },
    },
  })

  for (const record of candidates) {
    const match = await bcrypt.compare(raw, record.tokenHash)
    if (match) return record
  }
  return null
}

/** Set the HttpOnly refresh token cookie. */
function setRefreshCookie(reply: import('fastify').FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
    path:     '/api/auth',                   // only sent to auth endpoints
    maxAge:   Math.floor(REFRESH_EXPIRES_MS / 1000),
  })
}

/** Clear the refresh token cookie. */
function clearRefreshCookie(reply: import('fastify').FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
}

/**
 * Parse a duration string like "7d", "15m", "1h" into milliseconds.
 */
function parseDuration(str: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(str)
  if (!match) throw new Error(`Invalid duration: ${str}`)
  const n = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return n * multipliers[unit]
}

// Suppress unused import warning — jwt is used for type inference only
void jwt
