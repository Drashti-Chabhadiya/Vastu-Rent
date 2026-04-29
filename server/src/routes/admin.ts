import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ListingStatus, Role } from '@prisma/client'

const createListingSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20),
  pricePerDay: z.number().positive(),
  securityDeposit: z.number().min(0).optional(),
  categoryId: z.string(),
  images: z.array(z.string().url()).min(1).max(10),
  tags: z.array(z.string()).default([]),
  address: z.string(),
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  minRentalDays: z.number().int().positive().default(1),
  maxRentalDays: z.number().int().positive().default(30),
})

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /admin/my-listings  (ADMIN+) ──────────────────────────────────────
  // Returns all listings owned by the current admin
  fastify.get(
    '/my-listings',
    { preHandler: [fastify.requireRole('ADMIN')] },
    async (request, reply) => {
      const listings = await prisma.listing.findMany({
        where: { ownerId: request.user.sub },
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          _count: { select: { bookings: true, reviews: true } },
        },
      })
      return reply.send(listings)
    },
  )

  // ── POST /admin/listings  (ADMIN+) ────────────────────────────────────────
  // Create a new listing as an admin — starts as DRAFT pending SUPER_ADMIN approval
  fastify.post(
    '/listings',
    { preHandler: [fastify.requireRole('ADMIN')] },
    async (request, reply) => {
      const body = createListingSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      // SUPER_ADMIN listings go live immediately; ADMIN listings need approval
      const creatorRole = request.user.role
      const initialStatus: ListingStatus =
        creatorRole === 'SUPER_ADMIN' ? ListingStatus.ACTIVE : ListingStatus.DRAFT

      const listing = await prisma.listing.create({
        data: {
          ...body.data,
          pricePerDay: body.data.pricePerDay,
          ownerId: request.user.sub,
          status: initialStatus,
        },
      })

      return reply.code(201).send(listing)
    },
  )

  // ── PATCH /admin/listings/:id/status  (ADMIN+) ────────────────────────────
  // Toggle listing status (ACTIVE/PAUSED) – owner only
  fastify.patch(
    '/listings/:id/status',
    { preHandler: [fastify.requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = request.body as { status: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })
      if (listing.ownerId !== request.user.sub) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const updated = await prisma.listing.update({
        where: { id },
        data: { status: status as ListingStatus },
      })

      return reply.send(updated)
    },
  )

  // ── PATCH /admin/listings/:id  (ADMIN+) ───────────────────────────────────
  // Edit a listing – owner only
  fastify.patch(
    '/listings/:id',
    { preHandler: [fastify.requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })
      if (listing.ownerId !== request.user.sub) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const updated = await prisma.listing.update({
        where: { id },
        data: request.body as Record<string, unknown>,
      })

      return reply.send(updated)
    },
  )

  // ── DELETE /admin/listings/:id  (ADMIN+) ──────────────────────────────────
  // Soft delete a listing – owner only
  fastify.delete(
    '/listings/:id',
    { preHandler: [fastify.requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })
      if (listing.ownerId !== request.user.sub) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      await prisma.listing.update({ where: { id }, data: { status: 'DELETED' } })
      return reply.code(204).send()
    },
  )

  // ────────────────────────────────────────────────────────────────────────────
  // SUPER_ADMIN ONLY ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  // ── GET /admin/all-listings  (SUPER_ADMIN) ────────────────────────────────
  // Returns all listings across all admins
  fastify.get(
    '/all-listings',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const listings = await prisma.listing.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          owner: { select: { id: true, name: true, email: true, role: true } },
          _count: { select: { bookings: true, reviews: true } },
        },
      })
      return reply.send(listings)
    },
  )

  // ── GET /admin/all-bookings  (SUPER_ADMIN) ────────────────────────────────
  // Returns all bookings across all users
  fastify.get(
    '/all-bookings',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const bookings = await prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              images: true,
              city: true,
              pricePerDay: true,
              securityDeposit: true,
            },
          },
          renter: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      })
      return reply.send(bookings)
    },
  )

  // ── DELETE /admin/force-delete/:id  (SUPER_ADMIN) ─────────────────────────
  // Hard delete any listing (regardless of owner)
  fastify.delete(
    '/force-delete/:id',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })

      await prisma.listing.update({ where: { id }, data: { status: 'DELETED' } })
      return reply.code(204).send()
    },
  )

  // ── PATCH /admin/verify-admin/:userId  (SUPER_ADMIN) ──────────────────────
  // Promote a USER to ADMIN
  fastify.patch(
    '/verify-admin/:userId',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return reply.code(404).send({ error: 'User not found' })

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: Role.ADMIN },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })

      return reply.send(updated)
    },
  )

  // ── GET /admin/all-users  (SUPER_ADMIN) ───────────────────────────────────
  // Returns all users with their roles
  fastify.get(
    '/all-users',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          neighborhood: true,
          emailVerified: true,
          phoneVerified: true,
          governmentIdVerified: true,
          createdAt: true,
          _count: { select: { listings: true, bookingsAsRenter: true } },
        },
      })
      return reply.send(users)
    },
  )

  // ── GET /admin/platform-stats  (SUPER_ADMIN) ──────────────────────────────
  // Returns high-level platform overview
  fastify.get(
    '/platform-stats',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const [totalUsers, totalAdmins, totalListings, pendingListings, totalBookings] =
        await Promise.all([
          prisma.user.count({ where: { role: Role.USER } }),
          prisma.user.count({ where: { role: { in: [Role.ADMIN, 'SUPER_ADMIN' as Role] } } }),
          prisma.listing.count({ where: { status: { not: ListingStatus.DELETED } } }),
          prisma.listing.count({ where: { status: ListingStatus.DRAFT } }),
          prisma.booking.count(),
        ])

      return reply.send({
        totalUsers,
        totalAdmins,
        totalListings,
        pendingListings,
        totalBookings,
      })
    },
  )

  // ── PATCH /admin/approve-listing/:id  (SUPER_ADMIN) ───────────────────────
  // Approve a DRAFT listing → ACTIVE
  fastify.patch(
    '/approve-listing/:id',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })
      if (listing.status !== ListingStatus.DRAFT) {
        return reply.code(400).send({ error: 'Only DRAFT listings can be approved' })
      }

      const updated = await prisma.listing.update({
        where: { id },
        data: { status: ListingStatus.ACTIVE },
      })

      return reply.send(updated)
    },
  )

  // ── PATCH /admin/reject-listing/:id  (SUPER_ADMIN) ────────────────────────
  // Reject a DRAFT listing → DELETED
  fastify.patch(
    '/reject-listing/:id',
    { preHandler: [fastify.requireRole('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const listing = await prisma.listing.findUnique({ where: { id } })
      if (!listing) return reply.code(404).send({ error: 'Not found' })
      if (listing.status !== ListingStatus.DRAFT) {
        return reply.code(400).send({ error: 'Only DRAFT listings can be rejected' })
      }

      const updated = await prisma.listing.update({
        where: { id },
        data: { status: ListingStatus.DELETED },
      })

      return reply.send(updated)
    },
  )
}

export default adminRoutes
