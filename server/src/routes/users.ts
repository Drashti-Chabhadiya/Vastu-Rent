import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /users/:id  – public profile
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        listings: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            images: true,
            pricePerDay: true,
            city: true,
          },
          take: 6,
        },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { listings: true, reviewsReceived: true },
        },
      },
    })

    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send(user)
  })

  // PATCH /users/me  – update own profile (protected)
  fastify.patch(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = updateProfileSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const user = await prisma.user.update({
        where: { id: request.user.sub },
        data: body.data,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          phone: true,
          updatedAt: true,
        },
      })

      return reply.send(user)
    },
  )

  // GET /users/me/notifications  (protected)
  fastify.get(
    '/me/notifications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const notifications = await prisma.notification.findMany({
        where: { userId: request.user.sub },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
      return reply.send(notifications)
    },
  )

  // PATCH /users/me/notifications/:id/read  (protected)
  fastify.patch(
    '/me/notifications/:id/read',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const notification = await prisma.notification.findUnique({ where: { id } })
      if (!notification || notification.userId !== request.user.sub) {
        return reply.code(404).send({ error: 'Not found' })
      }
      const updated = await prisma.notification.update({
        where: { id },
        data: { read: true },
      })
      return reply.send(updated)
    },
  )
}

export default userRoutes
