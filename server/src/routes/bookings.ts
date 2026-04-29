import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getIO } from '../lib/socket-io.js'
import type { Prisma } from '@prisma/client'

// ── Helper: persist a DB notification and push it via socket ─────────────────
async function pushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  // Persist to DB so the user sees it even if they're offline
  await prisma.notification.create({
    data: { userId, type, title, body, data: (data ?? {}) as Prisma.InputJsonValue },
  })
  // Push in real-time if the user is connected
  getIO()?.to(`user:${userId}`).emit('notification:new', { type, title, body, data })
}

const createBookingSchema = z.object({
  listingId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().optional(),
})

const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /bookings  – current user's bookings as renter
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bookings = await prisma.booking.findMany({
        where: { renterId: request.user.sub },
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
        },
      })
      return reply.send(bookings)
    },
  )

  // GET /bookings/owner  – bookings for listings owned by current user
  fastify.get(
    '/owner',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bookings = await prisma.booking.findMany({
        where: { listing: { ownerId: request.user.sub } },
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
          renter: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        },
      })
      return reply.send(bookings)
    },
  )

  // GET /bookings/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          listing: {
            include: {
              owner: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          renter: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      if (!booking) return reply.code(404).send({ error: 'Not found' })

      const userId = request.user.sub
      const isRenter = booking.renterId === userId
      const isOwner = booking.listing.ownerId === userId

      if (!isRenter && !isOwner) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      return reply.send(booking)
    },
  )

  // POST /bookings
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createBookingSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const { listingId, startDate, endDate, notes } = body.data
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (end <= start) {
        return reply.code(400).send({ error: 'endDate must be after startDate' })
      }

      const listing = await prisma.listing.findUnique({ where: { id: listingId } })
      if (!listing || listing.status !== 'ACTIVE') {
        return reply.code(404).send({ error: 'Listing not available' })
      }

      if (listing.ownerId === request.user.sub) {
        return reply.code(400).send({ error: 'Cannot book your own listing' })
      }

      // Check for overlapping confirmed/active bookings
      const overlap = await prisma.booking.findFirst({
        where: {
          listingId,
          status: { in: ['CONFIRMED', 'ACTIVE'] },
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
      })

      if (overlap) {
        return reply.code(409).send({ error: 'Listing is not available for those dates' })
      }

      const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
      const totalPrice = Number(listing.pricePerDay) * days

      const booking = await prisma.booking.create({
        data: {
          listingId,
          renterId: request.user.sub,
          startDate: start,
          endDate: end,
          totalPrice,
          notes,
          status: 'PENDING',
        },
      })

      // ── Notify the listing owner ─────────────────────────────────────────
      const renter = await prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { name: true },
      })

      await pushNotification(
        listing.ownerId,
        'booking_request',
        '📦 New Rental Request',
        `${renter?.name ?? 'Someone'} wants to rent "${listing.title}" from ${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}.`,
        { bookingId: booking.id, listingId: listing.id },
      )

      return reply.code(201).send(booking)
    },
  )

  // PATCH /bookings/:id/status  – owner confirms/cancels; renter cancels
  fastify.patch(
    '/:id/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = request.body as { status: string }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { listing: true },
      })
      if (!booking) return reply.code(404).send({ error: 'Not found' })

      const userId = request.user.sub
      const isRenter = booking.renterId === userId
      const isOwner = booking.listing.ownerId === userId

      if (!isRenter && !isOwner) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      // Simple state-machine guard
      const allowed: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['ACTIVE', 'CANCELLED'],
        ACTIVE: ['COMPLETED', 'DISPUTED'],
      }

      if (!allowed[booking.status]?.includes(status)) {
        return reply
          .code(400)
          .send({ error: `Cannot transition from ${booking.status} to ${status}` })
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: status as never },
        include: {
          listing: { select: { id: true, title: true, ownerId: true } },
          renter: { select: { id: true, name: true } },
        },
      })

      // ── When COMPLETED: listing is available again ────────────────────────
      // The listing status stays ACTIVE throughout (it's the booking status
      // that tracks the rental lifecycle), but we explicitly ensure it's ACTIVE
      // in case it was paused during the rental.
      if (status === 'COMPLETED') {
        await prisma.listing.update({
          where: { id: booking.listingId },
          data: { status: 'ACTIVE' },
        })
      }

      // ── Notify the relevant party about the status change ────────────────
      const { listing: bl, renter: br } = updated

      if (status === 'CONFIRMED') {
        await pushNotification(
          br.id,
          'booking_confirmed',
          '✅ Booking Confirmed!',
          `Your rental of "${bl.title}" has been confirmed by the owner.`,
          { bookingId: id, listingId: bl.id },
        )
      } else if (status === 'CANCELLED') {
        // Notify whoever didn't cancel
        const notifyId = isOwner ? br.id : bl.ownerId
        const cancelledBy = isOwner ? 'The owner' : 'The renter'
        await pushNotification(
          notifyId,
          'booking_cancelled',
          '❌ Booking Cancelled',
          `${cancelledBy} cancelled the rental of "${bl.title}".`,
          { bookingId: id, listingId: bl.id },
        )
      } else if (status === 'COMPLETED') {
        await pushNotification(
          br.id,
          'booking_completed',
          '🎉 Rental Completed',
          `Your rental of "${bl.title}" is complete. Leave a review!`,
          { bookingId: id, listingId: bl.id },
        )
      }

      return reply.send(updated)
    },
  )
}

export default bookingRoutes
