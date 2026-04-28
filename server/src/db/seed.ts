/**
 * Seed script – run with: npm run db:seed
 * Creates sample categories and a demo user.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CATEGORIES = [
  { name: 'Tools & Equipment', slug: 'tools-equipment', icon: '🔧' },
  { name: 'Outdoor & Camping', slug: 'outdoor-camping', icon: '⛺' },
  { name: 'Electronics', slug: 'electronics', icon: '📷' },
  { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '🚴' },
  { name: 'Vehicles', slug: 'vehicles', icon: '🚗' },
  { name: 'Party & Events', slug: 'party-events', icon: '🎉' },
  { name: 'Home & Garden', slug: 'home-garden', icon: '🌱' },
  { name: 'Musical Instruments', slug: 'musical-instruments', icon: '🎸' },
]

async function main() {
  console.log('🌱  Seeding database…')

  // Categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log(`✅  ${CATEGORIES.length} categories seeded`)

  // Demo user
  const passwordHash = await bcrypt.hash('password123', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@peerrent.dev' },
    update: {},
    create: {
      email: 'demo@peerrent.dev',
      name: 'Demo User',
      passwordHash,
      bio: 'I love renting things locally!',
    },
  })
  console.log(`✅  Demo user: ${demo.email} / password123`)

  console.log('🎉  Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
