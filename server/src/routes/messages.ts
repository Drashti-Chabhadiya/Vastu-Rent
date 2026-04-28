import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createConversationSchema = z.object({
  recipientId: z.string(),
  listingId: z.string().optional(),
})

const sendMessageSchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1).max(2000),
})

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /messages/conversations  – list all conversations ─────────────────
  fastify.get(
    '/conversations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { id: request.user.sub } } },
        orderBy: { updatedAt: 'desc' },
        include: {
          participants: {
            select: { id: true, name: true, avatarUrl: true },
          },
          listing: {
            select: { id: true, title: true, images: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
      })
      return reply.send(conversations)
    },
  )

  // ── GET /messages/conversations/:id  – messages in a conversation ─────────
  fastify.get(
    '/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { before, limit: rawLimit } = request.query as {
        before?: string
        limit?: string
      }
      const limit = Math.min(Number(rawLimit ?? 50), 100)

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          participants: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, title: true, images: true } },
          messages: {
            where: before ? { createdAt: { lt: new Date(before) } } : undefined,
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })

      if (!conversation) return reply.code(404).send({ error: 'Not found' })

      const isMember = conversation.participants.some(
        (p) => p.id === request.user.sub,
      )
      if (!isMember) return reply.code(403).send({ error: 'Forbidden' })

      return reply.send(conversation)
    },
  )

  // ── POST /messages/conversations  – find or create a conversation ─────────
  fastify.post(
    '/conversations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createConversationSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const { recipientId, listingId } = body.data
      const senderId = request.user.sub

      if (senderId === recipientId) {
        return reply.code(400).send({ error: 'Cannot start a conversation with yourself' })
      }

      // Verify recipient exists
      const recipient = await prisma.user.findUnique({ where: { id: recipientId } })
      if (!recipient) return reply.code(404).send({ error: 'Recipient not found' })

      // Find existing conversation between these two users (optionally scoped to listing)
      const existing = await prisma.conversation.findFirst({
        where: {
          ...(listingId ? { listingId } : {}),
          AND: [
            { participants: { some: { id: senderId } } },
            { participants: { some: { id: recipientId } } },
          ],
        },
        include: {
          participants: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, title: true, images: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50,
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })

      if (existing) return reply.send(existing)

      const conversation = await prisma.conversation.create({
        data: {
          ...(listingId ? { listingId } : {}),
          participants: {
            connect: [{ id: senderId }, { id: recipientId }],
          },
        },
        include: {
          participants: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, title: true, images: true } },
          messages: true,
        },
      })

      return reply.code(201).send(conversation)
    },
  )

  // ── POST /messages  – send a message (REST fallback; socket is preferred) ──
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = sendMessageSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const { conversationId, body: messageBody } = body.data
      const senderId = request.user.sub

      // Verify membership
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { some: { id: senderId } },
        },
      })
      if (!conversation) return reply.code(403).send({ error: 'Forbidden' })

      const message = await prisma.message.create({
        data: { body: messageBody, senderId, conversationId },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })

      return reply.code(201).send(message)
    },
  )

  // ── PATCH /messages/:id/read  – mark a single message as read ─────────────
  fastify.patch(
    '/:id/read',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const message = await prisma.message.findUnique({
        where: { id },
        include: {
          conversation: {
            include: { participants: { select: { id: true } } },
          },
        },
      })

      if (!message) return reply.code(404).send({ error: 'Not found' })

      const isMember = message.conversation.participants.some(
        (p) => p.id === request.user.sub,
      )
      if (!isMember) return reply.code(403).send({ error: 'Forbidden' })

      const updated = await prisma.message.update({
        where: { id },
        data: { status: 'READ' },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      return reply.send(updated)
    },
  )
}

export default messageRoutes
