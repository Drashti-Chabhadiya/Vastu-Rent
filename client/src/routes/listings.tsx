import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { categories, listings } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'

const searchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
})

export const Route = createFileRoute('/listings')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [cats, result] = await Promise.all([
      categories.list(),
      listings.search({ ...deps, limit: 20 }),
    ])
    return { cats, result }
  },
  component: ListingsPage,
})

function ListingsPage() {
  const { cats, result } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/listings' })
  const {
    lat,
    lng,
    error: geoError,
    loading: geoLoading,
    request: requestGeo,
  } = useGeolocation()

  function updateSearch(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) })
  }

  // When geolocation is granted, update the search params
  if (
    lat !== null &&
    lng !== null &&
    (search.lat !== lat || search.lng !== lng)
  ) {
    updateSearch({ lat, lng, radiusKm: search.radiusKm ?? 10 })
  }

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
        Browse Listings
      </h1>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="island-shell mb-6 flex flex-wrap gap-3 rounded-2xl p-4">
        <input
          type="search"
          placeholder="Search…"
          defaultValue={search.q ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateSearch({
                q: (e.target as HTMLInputElement).value || undefined,
              })
            }
          }}
          className="flex-1 rounded-full border border-(--line) bg-(--surface-strong) px-4 py-2 text-sm outline-none focus:border-(--lagoon)"
        />

        <select
          value={search.categoryId ?? ''}
          onChange={(e) =>
            updateSearch({ categoryId: e.target.value || undefined })
          }
          className="rounded-full border border-(--line) bg-(--surface-strong) px-4 py-2 text-sm text-(--sea-ink) outline-none"
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min $"
          defaultValue={search.minPrice ?? ''}
          onBlur={(e) =>
            updateSearch({
              minPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-24 rounded-full border border-(--line) bg-(--surface-strong) px-4 py-2 text-sm outline-none focus:border-(--lagoon)"
        />
        <input
          type="number"
          placeholder="Max $"
          defaultValue={search.maxPrice ?? ''}
          onBlur={(e) =>
            updateSearch({
              maxPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-24 rounded-full border border-(--line) bg-(--surface-strong) px-4 py-2 text-sm outline-none focus:border-(--lagoon)"
        />

        {/* Geo search */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={requestGeo}
            disabled={geoLoading}
            className="rounded-full border border-(--line) bg-(--surface-strong) px-4 py-2 text-sm font-semibold text-(--sea-ink) transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {geoLoading
              ? '📍 Locating…'
              : search.lat
                ? '📍 Near me ✓'
                : '📍 Near me'}
          </button>
          {search.lat && (
            <>
              <select
                value={search.radiusKm ?? 10}
                onChange={(e) =>
                  updateSearch({ radiusKm: Number(e.target.value) })
                }
                className="rounded-full border border-(--line) bg-(--surface-strong) px-3 py-2 text-sm outline-none"
              >
                {[5, 10, 25, 50, 100].map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  updateSearch({
                    lat: undefined,
                    lng: undefined,
                    radiusKm: undefined,
                  })
                }
                className="text-xs text-(--sea-ink-soft) hover:underline"
              >
                Clear
              </button>
            </>
          )}
        </div>
        {geoError && <p className="w-full text-xs text-red-500">{geoError}</p>}
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result.data.length === 0 ? (
        <div className="island-shell rounded-2xl p-10 text-center text-[var(--sea-ink-soft)]">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 font-semibold">No listings found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            {result.meta.total} listing{result.meta.total !== 1 ? 's' : ''}{' '}
            found
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {result.data.map((item) => (
              <Link
                key={item.id}
                to="/listings/$id"
                params={{ id: item.id }}
                className="island-shell feature-card block overflow-hidden rounded-2xl border border-[var(--line)] no-underline"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--sand)]">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="island-kicker mb-1">{item.category.name}</p>
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-[var(--sea-ink)]">
                    {item.title}
                  </h3>
                  <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                    {item.city}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[var(--lagoon-deep)]">
                    ${Number(item.pricePerDay).toFixed(2)}{' '}
                    <span className="font-normal text-[var(--sea-ink-soft)]">
                      / day
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {result.meta.pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: result.meta.pages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => updateSearch({ page: p })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      p === search.page
                        ? 'bg-[var(--lagoon-deep)] text-white'
                        : 'border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] hover:-translate-y-0.5'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
