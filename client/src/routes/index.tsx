import { createFileRoute, Link } from '@tanstack/react-router'
import { categories, listings } from '../lib/api'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [cats, featured] = await Promise.all([
      categories.list(),
      listings.search({ limit: 8 }),
    ])
    return { cats, featured: featured.data }
  },
  component: HomePage,
})

function HomePage() {
  const { cats, featured } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />

        <p className="island-kicker mb-3">Hyper-local · Peer-to-Peer</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Rent anything from your neighbours.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Tools, cameras, bikes, camping gear — borrow what you need from people
          nearby. List what you own and earn while it sits idle.
        </p>

        {/* Search bar */}
        <form
          action="/listings"
          method="get"
          className="flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            name="q"
            type="search"
            placeholder="What do you need? (e.g. drill, kayak…)"
            className="flex-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.25)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)]"
          >
            Search
          </button>
        </form>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {cats.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Browse by category
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {cats.map((cat) => (
              <Link
                key={cat.id}
                to="/listings"
                search={{ categoryId: cat.id }}
                className="island-shell feature-card flex flex-col items-center gap-2 rounded-2xl border border-[var(--line)] p-4 text-center no-underline transition"
              >
                <span className="text-2xl">{cat.icon ?? '📦'}</span>
                <span className="text-xs font-semibold text-[var(--sea-ink)]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured listings ─────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
              Recently listed
            </h2>
            <Link
              to="/listings"
              className="text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item, i) => (
              <ListingCard key={item.id} listing={item} delay={i * 60} />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="island-shell mt-14 rounded-2xl p-8">
        <p className="island-kicker mb-4">How it works</p>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            [
              '🔍',
              'Find',
              'Search by location or category to discover items near you.',
            ],
            [
              '💬',
              'Connect',
              'Chat directly with the owner to arrange pickup and details.',
            ],
            ['🤝', 'Rent', 'Agree on dates, pay securely, and enjoy the item.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex flex-col gap-2">
              <span className="text-3xl">{icon}</span>
              <h3 className="text-base font-semibold text-[var(--sea-ink)]">
                {title}
              </h3>
              <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function ListingCard({
  listing,
  delay = 0,
}: {
  listing: ReturnType<typeof Route.useLoaderData>['featured'][number]
  delay?: number
}) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="island-shell feature-card rise-in block overflow-hidden rounded-2xl border border-[var(--line)] no-underline"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--sand)]">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            📦
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="island-kicker mb-1">{listing.category.name}</p>
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-[var(--sea-ink)]">
          {listing.title}
        </h3>
        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">{listing.city}</p>
        <p className="mt-2 text-sm font-bold text-[var(--lagoon-deep)]">
          ${Number(listing.pricePerDay).toFixed(2)}{' '}
          <span className="font-normal text-[var(--sea-ink-soft)]">/ day</span>
        </p>
      </div>
    </Link>
  )
}
