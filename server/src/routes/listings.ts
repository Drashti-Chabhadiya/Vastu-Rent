import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createListingSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20),
  pricePerDay: z.number().positive(),
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

const searchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().default(10),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
})

// Raw row returned by the Haversine query
interface GeoRow {
  id: string
  distance_km: number
}

const listingRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /listings  – search & browse ──────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const query = searchSchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: query.error.flatten() })
    }

    const { q, categoryId, lat, lng, radiusKm, minPrice, maxPrice, page, limit } =
      query.data

    const skip = (page - 1) * limit

    // ── Geo-filter: Haversine via raw SQL ──────────────────────────────────
    // When lat/lng are provided we run a raw query to get IDs within the
    // radius, then use those IDs in the main Prisma query.  This avoids
    // pulling every row into JS and is accurate to ~0.5% for radii < 500 km.
    let geoIds: string[] | null = null

    if (lat !== undefined && lng !== undefined) {
      const rows = await prisma.$queryRaw<GeoRow[]>`
        SELECT id,
          (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(latitude))
            )
          )) AS distance_km
        FROM listings
        WHERE status = 'ACTIVE'
        HAVING distance_km < ${radiusKm}
        ORDER BY distance_km ASC
      `
      geoIds = rows.map((r) => r.id)
      // If nothing is in range, return empty immediately
      if (geoIds.length === 0) {
        return reply.send({ data: [], meta: { total: 0, page, limit, pages: 0 } })
      }
    }

    // ── Build Prisma where clause ──────────────────────────────────────────
    const where: Record<string, unknown> = { status: 'ACTIVE' }

    if (geoIds) where.id = { in: geoIds }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ]
    }

    if (categoryId) where.categoryId = categoryId

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerDay = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    }

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        // When geo results are present, preserve the distance order from SQL
        orderBy: geoIds ? undefined : { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          owner: { select: { id: true, name: true, avatarUrl: true, emailVerified: true, phoneVerified: true, governmentIdVerified: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.listing.count({ where }),
    ])

    // Re-sort by distance when geo is active (Prisma doesn't preserve raw order)
    const data =
      geoIds
        ? [...items].sort(
            (a, b) => geoIds!.indexOf(a.id) - geoIds!.indexOf(b.id),
          )
        : items

    return reply.send({
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  })

  // ── GET /listings/:id ──────────────────────────────────────────────────────
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
            emailVerified: true,
            phoneVerified: true,
            governmentIdVerified: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { reviews: true, bookings: true } },
      },
    })

    if (!listing || listing.status === 'DELETED') {
      return reply.code(404).send({ error: 'Listing not found' })
    }

    return reply.send(listing)
  })

  // ── GET /listings/:id/availability ────────────────────────────────────────
  // Returns whether a date range is available and the list of blocked dates.
  fastify.get('/:id/availability', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { startDate, endDate } = request.query as {
      startDate?: string
      endDate?: string
    }

    const listing = await prisma.listing.findUnique({ where: { id } })
    if (!listing || listing.status !== 'ACTIVE') {
      return reply.code(404).send({ error: 'Listing not found' })
    }

    // Fetch all confirmed/active bookings for this listing
    const existingBookings = await prisma.booking.findMany({
      where: {
        listingId: id,
        status: { in: ['CONFIRMED', 'ACTIVE'] },
      },
      select: { startDate: true, endDate: true },
    })

    // Build a flat list of blocked date strings (YYYY-MM-DD)
    const blockedDates: string[] = []
    for (const b of existingBookings) {
      const cur = new Date(b.startDate)
      const end = new Date(b.endDate)
      while (cur <= end) {
        blockedDates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
    }

    let available = true
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const overlap = existingBookings.some(
        (b) => b.startDate < end && b.endDate > start,
      )
      available = !overlap
    }

    return reply.send({ available, blockedDates: [...new Set(blockedDates)] })
  })

  // ── POST /listings  (protected) ───────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createListingSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() })
      }

      const listing = await prisma.listing.create({
        data: {
          ...body.data,
          pricePerDay: body.data.pricePerDay,
          ownerId: request.user.sub,
          status: 'ACTIVE',
        },
      })

      return reply.code(201).send(listing)
    },
  )

  // ── PATCH /listings/:id  (protected – owner only) ─────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [fastify.authenticate] },
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

  // ── DELETE /listings/:id  (protected – owner only, soft delete) ───────────
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate] },
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
}

export default listingRoutes
