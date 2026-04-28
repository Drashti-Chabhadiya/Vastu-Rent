import type { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'

interface JwtPayload {
  sub: string
  email: string
  role: string
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
    },
  })

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('Authentication required'))

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
      socket.data.userId = payload.sub
      socket.data.email = payload.email
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    console.log(`[socket] user ${userId} connected (${socket.id})`)

    // Join a personal room so we can push notifications
    socket.join(`user:${userId}`)

    // ── Join a conversation room ─────────────────────────────────────────────
    // Also sends the last 50 messages so the client is up-to-date after
    // a reconnect without needing a separate REST call.
    socket.on('conversation:join', async (conversationId: string) => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { some: { id: userId } },
        },
      })

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' })
        return
      }

      socket.join(`conversation:${conversationId}`)
      socket.emit('conversation:joined', { conversationId })

      // Send recent history so the client doesn't need a separate REST call
      const history = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      })
      socket.emit('conversation:history', history.reverse())
    })

    // ── Leave a conversation room ────────────────────────────────────────────
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // ── Send a message via socket ────────────────────────────────────────────
    // Persists to DB first, then broadcasts — socket is delivery, not source of truth.
    socket.on(
      'message:send',
      async (data: { conversationId: string; body: string }) => {
        const { conversationId, body } = data

        if (!body?.trim()) return

        // Verify membership
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            participants: { some: { id: userId } },
          },
          include: { participants: { select: { id: true } } },
        })

        if (!conversation) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        // Persist first
        const message = await prisma.message.create({
          data: { body, senderId: userId, conversationId },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        })

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })

        // Broadcast to everyone in the room (including sender for confirmation)
        io.to(`conversation:${conversationId}`).emit('message:new', message)

        // Push notification to offline participants
        for (const participant of conversation.participants) {
          if (participant.id !== userId) {
            io.to(`user:${participant.id}`).emit('notification:new', {
              type: 'message',
              title: 'New message',
              body: body.slice(0, 80),
              data: { conversationId },
            })
          }
        }
      },
    )

    // ── Mark all messages in a conversation as read ──────────────────────────
    // Call this when the user opens a conversation.
    socket.on('conversation:read', async (conversationId: string) => {
      // Verify membership
      const isMember = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { some: { id: userId } },
        },
      })
      if (!isMember) return

      await prisma.message.updateMany({
        where: {
          conversationId,
          status: { not: 'READ' },
          senderId: { not: userId }, // only mark messages from others
        },
        data: { status: 'READ' },
      })

      // Notify the other participants that their messages were read
      socket
        .to(`conversation:${conversationId}`)
        .emit('messages:read', { conversationId, userId })
    })

    // ── Typing indicators ────────────────────────────────────────────────────
    socket.on('typing:start', (conversationId: string) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit('typing:start', { userId, conversationId })
    })

    socket.on('typing:stop', (conversationId: string) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit('typing:stop', { userId, conversationId })
    })

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] user ${userId} disconnected`)
    })
  })

  return io
}
