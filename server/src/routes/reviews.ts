import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /reviews/listing/:listingId
  fastify.get('/listing/:listingId', async (request, reply) => {
    const { listingId } = request.params as { listingId: string }
    const reviews = await prisma.review.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
    return reply.send(reviews)
  })

  // POST /reviews  (protected – renter of a completed booking)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createReviewSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const { bookingId, rating, comment } = body.data

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { listing: true },
      })

      if (!booking) return reply.code(404).send({ error: 'Booking not found' })
      if (booking.renterId !== request.user.sub) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      if (booking.status !== 'COMPLETED') {
        return reply.code(400).send({ error: 'Booking must be completed to review' })
      }

      const existing = await prisma.review.findUnique({ where: { bookingId } })
      if (existing) {
        return reply.code(409).send({ error: 'Review already submitted' })
      }

      const review = await prisma.review.create({
        data: {
          bookingId,
          listingId: booking.listingId,
          authorId: request.user.sub,
          subjectId: booking.listing.ownerId,
          rating,
          comment,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      return reply.code(201).send(review)
    },
  )
}

export default reviewRoutes
