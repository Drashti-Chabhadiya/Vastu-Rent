import { createFileRoute } from '@tanstack/react-router'
import { categories, listings } from '@/lib/api'
import { HomePage } from '@/features/home'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    accessDenied: search.accessDenied === '1' ? ('1' as const) : undefined,
  }),
  loader: async () => {
    const [cats, featured] = await Promise.all([
      categories.list(),
      listings.search({ limit: 6 }),
    ])
    return { cats, featured: featured.data }
  },
  component: function HomeRoute() {
    const { cats, featured } = Route.useLoaderData()
    return <HomePage cats={cats} featured={featured} />
  },
})
