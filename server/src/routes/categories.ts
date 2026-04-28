import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /categories
  fastify.get('/', async (_request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return reply.send(categories)
  })
}

export default categoryRoutes
