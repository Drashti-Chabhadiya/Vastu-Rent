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

  // ── Demo USER ──────────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('password123', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@peerrent.dev' },
    update: {},
    create: {
      email: 'demo@peerrent.dev',
      name: 'Demo User',
      passwordHash: userHash,
      bio: 'I love renting things locally!',
      role: 'USER',
    },
  })
  console.log(`✅  Demo USER    : ${demo.email} / password123`)

  // ── Demo ADMIN (product owner) ─────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vastu-rent.dev' },
    update: {},
    create: {
      email: 'admin@vastu-rent.dev',
      name: 'Ravi Sharma (Admin)',
      passwordHash: adminHash,
      bio: 'I rent out tools and equipment in Bengaluru.',
      phone: '+919876543210',
      neighborhood: 'Koramangala, Bengaluru',
      phoneVerified: true,
      emailVerified: true,
      role: 'ADMIN',
    },
  })
  console.log(`✅  Demo ADMIN   : ${adminUser.email} / admin123`)

  // ── Super Admin ────────────────────────────────────────────────────────────
  const superHash = await bcrypt.hash('superadmin123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@vastu-rent.dev' },
    update: {},
    create: {
      email: 'superadmin@vastu-rent.dev',
      name: 'Super Admin',
      passwordHash: superHash,
      bio: 'Platform manager with full access.',
      phone: '+919999999999',
      neighborhood: 'Mumbai, Maharashtra',
      phoneVerified: true,
      emailVerified: true,
      governmentIdVerified: true,
      role: 'SUPER_ADMIN' as never, // enum value added via migration
    },
  })
  console.log(`✅  SUPER ADMIN  : ${superAdmin.email} / superadmin123`)

  console.log('')
  console.log('─────────────────────────────────────────')
  console.log('  Login credentials')
  console.log('─────────────────────────────────────────')
  console.log('  USER        demo@peerrent.dev        / password123')
  console.log('  ADMIN       admin@vastu-rent.dev     / admin123')
  console.log('  SUPER_ADMIN superadmin@vastu-rent.dev / superadmin123')
  console.log('─────────────────────────────────────────')
  console.log('🎉  Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
