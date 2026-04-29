import { createFileRoute } from '@tanstack/react-router'
import { bookings as bookingsApi, admin, categories, type Booking, type AdminListing, type Category } from '@/lib/api'
import { DashboardPage } from '@/features/dashboard'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    const [mine, ownerBookings, myListings, cats] = await Promise.all([
      bookingsApi.mine().catch(() => [] as Booking[]),
      bookingsApi.ownerBookings().catch(() => [] as Booking[]),
      admin.myListings().catch(() => [] as AdminListing[]),
      categories.list().catch(() => [] as Category[]),
    ])
    return { mine, ownerBookings, myListings, cats }
  },
  component: function DashboardRoute() {
    const data = Route.useLoaderData()
    return <DashboardPage {...data} />
  },
})
