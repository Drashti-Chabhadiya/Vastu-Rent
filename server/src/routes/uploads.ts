import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { generateUploadSignature } from '../lib/cloudinary.js'

const folderSchema = z.object({
  folder: z.enum(['listings', 'avatars']).default('listings'),
})

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /uploads/sign?folder=listings
   *
   * Returns a short-lived Cloudinary signed upload credential.
   * The client uses this to POST the file directly to Cloudinary —
   * the raw file bytes never touch this server.
   */
  fastify.get(
    '/sign',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = folderSchema.safeParse(request.query)
      if (!query.success) {
        return reply.code(400).send({ error: query.error.flatten() })
      }

      const creds = generateUploadSignature(query.data.folder)
      return reply.send(creds)
    },
  )
}

export default uploadRoutes
