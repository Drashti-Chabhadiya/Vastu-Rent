import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { categories, listings } from '../lib/api'
import type { Listing } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    accessDenied: search.accessDenied === '1' ? ('1' as const) : undefined,
  }),
  loader: async () => {
    const [cats, featured] = await Promise.all([
      categories.list(),
      listings.search({ limit: 8 }),
    ])
    return { cats, featured: featured.data }
  },
  component: HomePage,
})

// ── Popular cities for quick-filter ──────────────────────────────────────────
const CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Surat',
  'Jaipur',
]

function HomePage() {
  const { cats, featured } = Route.useLoaderData()
  const { accessDenied } = Route.useSearch()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showDenied, setShowDenied] = useState(!!accessDenied)

  // Clear the accessDenied param from the URL after showing the banner
  useEffect(() => {
    if (accessDenied) {
      navigate({ to: '/', search: { accessDenied: undefined }, replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hyper-local state ───────────────────────────────────────────────────────
  const [nearbyItems, setNearbyItems] = useState<Listing[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyRadius, setNearbyRadius] = useState(10)
  const [geoGranted, setGeoGranted] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  // Auto-request location on mount (silent — no prompt if already denied)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        if (result.state === 'granted') fetchNearby()
      })
      .catch(() => {
        // permissions API not available — skip silent check
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function fetchNearby(lat?: number, lng?: number, radius = nearbyRadius) {
    const useLat = lat ?? userLat
    const useLng = lng ?? userLng
    if (useLat === null || useLng === null) return

    setNearbyLoading(true)
    listings
      .search({ lat: useLat, lng: useLng, radiusKm: radius, limit: 8 })
      .then((res) => {
        setNearbyItems(res.data)
        setNearbyLoading(false)
      })
      .catch(() => setNearbyLoading(false))
  }

  function requestLocation() {
    if (!navigator.geolocation) return
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLat(lat)
        setUserLng(lng)
        setGeoGranted(true)
        fetchNearby(lat, lng, nearbyRadius)
      },
      () => setNearbyLoading(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function changeRadius(r: number) {
    setNearbyRadius(r)
    fetchNearby(undefined, undefined, r)
  }

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      {/* ── Access Denied Banner ─────────────────────────────────────────── */}
      {showDenied && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <p className="font-semibold text-red-800">Access Denied</p>
              <p className="text-sm text-red-700">
                You don't have permission to access that page.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDenied(false)}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />

        <p className="island-kicker mb-3">Vastu-Rent · Sharing Economy</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Rent anything from your neighbours.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Tools, cameras, bikes, camping gear — borrow what you need from people
          nearby. List what you own and earn while it sits idle.
        </p>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
            navigate({ to: '/listings', search: q ? { q } : {} })
          }}
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

        {/* Personalised greeting */}
        {user && (
          <p className="mt-5 text-sm text-[var(--sea-ink-soft)]">
            👋 Welcome back, <strong>{user.name.split(' ')[0]}</strong>
            {user.neighborhood ? ` · ${user.neighborhood}` : ''}
          </p>
        )}
      </section>

      {/* ── City quick-filter ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="flex-shrink-0 text-xs font-semibold text-[var(--sea-ink-soft)]">
            🏙️ Browse by city:
          </span>
          {CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => navigate({ to: '/listings', search: { q: city } })}
              className="flex-shrink-0 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] hover:bg-[rgba(79,184,178,0.1)]"
            >
              {city}
            </button>
          ))}
        </div>
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

      {/* ── Hyper-local section ───────────────────────────────────────────── */}
      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
              📍 Near You
            </h2>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              Items available within {nearbyRadius} km of your location
            </p>
          </div>

          <div className="flex items-center gap-2">
            {geoGranted && (
              <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] p-1">
                {[5, 10, 25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => changeRadius(r)}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold transition',
                      nearbyRadius === r
                        ? 'bg-[var(--lagoon-deep)] text-white'
                        : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]',
                    ].join(' ')}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            )}

            {!geoGranted && (
              <button
                type="button"
                onClick={requestLocation}
                disabled={nearbyLoading}
                className="flex items-center gap-2 rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:opacity-60"
              >
                {nearbyLoading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Locating…
                  </>
                ) : (
                  <>📡 Enable location</>
                )}
              </button>
            )}

            {geoGranted && (
              <Link
                to="/listings"
                search={{ lat: userLat ?? undefined, lng: userLng ?? undefined, radiusKm: nearbyRadius }}
                className="text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
              >
                View all →
              </Link>
            )}
          </div>
        </div>

        {/* Not yet enabled */}
        {!geoGranted && !nearbyLoading && nearbyItems.length === 0 && (
          <div className="island-shell flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="text-5xl">🗺️</span>
            <p className="font-semibold text-[var(--sea-ink)]">
              Discover items near you
            </p>
            <p className="max-w-sm text-sm text-[var(--sea-ink-soft)]">
              Enable location to see what's available within {nearbyRadius} km.
              Your location is never stored or shared.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="rounded-full bg-[var(--lagoon-deep)] px-6 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)]"
            >
              📡 Show items near me
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {nearbyLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="island-shell overflow-hidden rounded-2xl">
                <div className="aspect-[4/3] w-full animate-pulse bg-[var(--sand)]" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-1/3 animate-pulse rounded-full bg-[var(--sand)]" />
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--sand)]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-[var(--sand)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!nearbyLoading && nearbyItems.length > 0 && (
          <>
            {nearbyItems.length === 0 ? (
              <div className="island-shell rounded-2xl p-8 text-center text-[var(--sea-ink-soft)]">
                <p className="text-3xl">🔍</p>
                <p className="mt-2 font-semibold">Nothing within {nearbyRadius} km</p>
                <button
                  type="button"
                  onClick={() => changeRadius(nearbyRadius === 5 ? 10 : nearbyRadius === 10 ? 25 : 50)}
                  className="mt-2 text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
                >
                  Expand to {nearbyRadius === 5 ? 10 : nearbyRadius === 10 ? 25 : 50} km →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {nearbyItems.map((item, i) => (
                  <ListingCard key={item.id} listing={item} delay={i * 50} showDistance />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Trending (fallback / always visible) ─────────────────────────── */}
      {featured.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
              🔥 Trending Listings
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
            ['🔍', 'Find', 'Search by location or category to discover items near you.'],
            ['💬', 'Connect', 'Chat directly with the owner to arrange pickup and details.'],
            ['🤝', 'Rent', 'Agree on dates, pay securely, and enjoy the item.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex flex-col gap-2">
              <span className="text-3xl">{icon}</span>
              <h3 className="text-base font-semibold text-[var(--sea-ink)]">{title}</h3>
              <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

// ── Listing card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  delay = 0,
  showDistance = false,
}: {
  listing: Listing
  delay?: number
  showDistance?: boolean
}) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="island-shell feature-card rise-in group block overflow-hidden rounded-2xl border border-[var(--line)] no-underline"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--sand)]">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">📦</div>
        )}
        {/* Category badge */}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          {listing.category.icon} {listing.category.name}
        </span>
        {/* Distance badge (shown when geo is active) */}
        {showDistance && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--lagoon-deep)]/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            📍 Nearby
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-[var(--sea-ink)]">
          {listing.title}
        </h3>
        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
          📍 {listing.city}
          {listing.state ? `, ${listing.state}` : ''}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--lagoon-deep)]">
            ₹{Number(listing.pricePerDay).toFixed(0)}
            <span className="font-normal text-[var(--sea-ink-soft)]"> / day</span>
          </p>
          {listing._count && listing._count.reviews > 0 && (
            <span className="text-xs text-[var(--sea-ink-soft)]">
              ⭐ {listing._count.reviews}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
