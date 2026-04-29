import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../lib/env.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string }
    user:    { sub: string; email: string; role: string }
  }
}

// Role hierarchy: SUPER_ADMIN > ADMIN > USER
const ROLE_RANK: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // ── Cookie support (needed for HttpOnly refresh token) ────────────────────
  await fastify.register(fastifyCookie)

  // ── JWT for access tokens ─────────────────────────────────────────────────
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // ── Decorator: authenticate ───────────────────────────────────────────────
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.code(401).send({ error: 'Unauthorized' })
      }
    },
  )

  // ── Decorator: optionalAuthenticate ──────────────────────────────────────
  fastify.decorate(
    'optionalAuthenticate',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        // no-op
      }
    },
  )

  // ── Decorator factory: requireRole(minRole) ───────────────────────────────
  fastify.decorate(
    'requireRole',
    (minRole: string) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify()
        } catch {
          return reply.code(401).send({ error: 'Unauthorized' })
        }
        const userRank    = ROLE_RANK[request.user.role] ?? 0
        const requiredRank = ROLE_RANK[minRole] ?? 99
        if (userRank < requiredRank) {
          return reply.code(403).send({ error: 'Forbidden: insufficient role' })
        }
      },
  )
}

export default fp(authPlugin, { name: 'auth' })

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (minRole: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
