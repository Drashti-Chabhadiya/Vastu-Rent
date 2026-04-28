import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'

import { env } from './lib/env.js'
import authPlugin from './plugins/auth.js'
import { createSocketServer } from './socket/index.js'

import authRoutes from './routes/auth.js'
import listingRoutes from './routes/listings.js'
import bookingRoutes from './routes/bookings.js'
import messageRoutes from './routes/messages.js'
import reviewRoutes from './routes/reviews.js'
import categoryRoutes from './routes/categories.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/uploads.js'

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // ── CORS ──────────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  })

  // ── Multipart (file uploads) ───────────────────────────────────────────────
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  // ── Auth plugin (JWT) ──────────────────────────────────────────────────────
  await fastify.register(authPlugin)

  // ── API routes ─────────────────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(listingRoutes, { prefix: '/api/listings' })
  await fastify.register(bookingRoutes, { prefix: '/api/bookings' })
  await fastify.register(messageRoutes, { prefix: '/api/messages' })
  await fastify.register(reviewRoutes, { prefix: '/api/reviews' })
  await fastify.register(categoryRoutes, { prefix: '/api/categories' })
  await fastify.register(userRoutes, { prefix: '/api/users' })
  await fastify.register(uploadRoutes, { prefix: '/api/uploads' })

  // ── Health check ───────────────────────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // ── Attach Socket.io to the underlying http.Server ────────────────────────
  // fastify.server is already the http.Server — attach Socket.io directly
  // instead of wrapping it in a second createServer() call.
  createSocketServer(fastify.server)

  // ── Start ──────────────────────────────────────────────────────────────────
  await fastify.listen({ port: env.PORT, host: env.HOST })
  console.log(`🚀  Server listening on http://${env.HOST}:${env.PORT}`)
  console.log(`🔌  Socket.io ready`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
