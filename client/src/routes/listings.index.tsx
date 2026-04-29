import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { categories, listings } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'

// ── Search schema (URL params) ────────────────────────────────────────────────

const searchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
})

export const Route = createFileRoute('/listings/')({
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

// ── Radius options ────────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [5, 10, 25, 50, 100]

// ── Component ─────────────────────────────────────────────────────────────────

function ListingsPage() {
  const { cats, result } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/listings' })

  const { lat, lng, error: geoError, loading: geoLoading, request: requestGeo } =
    useGeolocation()

  // Local state for controlled inputs (avoids re-fetching on every keystroke)
  const [qInput, setQInput] = useState(search.q ?? '')
  const [cityInput, setCityInput] = useState(search.city ?? '')
  const [minInput, setMinInput] = useState(search.minPrice?.toString() ?? '')
  const [maxInput, setMaxInput] = useState(search.maxPrice?.toString() ?? '')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync geo coords into URL when granted
  useEffect(() => {
    if (lat !== null && lng !== null && (search.lat !== lat || search.lng !== lng)) {
      navigate({
        search: (prev) => ({
          ...prev,
          lat,
          lng,
          radiusKm: prev.radiusKm ?? 10,
          page: 1,
        }),
      })
    }
  }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps

  function push(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) })
  }

  function submitSearch() {
    push({
      q: qInput.trim() || undefined,
      city: cityInput.trim() || undefined,
      minPrice: minInput ? Number(minInput) : undefined,
      maxPrice: maxInput ? Number(maxInput) : undefined,
    })
  }

  function clearGeo() {
    push({ lat: undefined, lng: undefined, radiusKm: undefined })
  }

  function clearAll() {
    setQInput('')
    setCityInput('')
    setMinInput('')
    setMaxInput('')
    navigate({ search: { page: 1 } })
  }

  // Active filter chips
  const activeFilters: { label: string; onRemove: () => void }[] = []
  if (search.q) activeFilters.push({ label: `"${search.q}"`, onRemove: () => push({ q: undefined }) })
  if (search.city) activeFilters.push({ label: `📍 ${search.city}`, onRemove: () => { setCityInput(''); push({ city: undefined }) } })
  if (search.categoryId) {
    const cat = cats.find((c) => c.id === search.categoryId)
    if (cat) activeFilters.push({ label: `${cat.icon} ${cat.name}`, onRemove: () => push({ categoryId: undefined }) })
  }
  if (search.lat) activeFilters.push({ label: `📡 Within ${search.radiusKm ?? 10} km`, onRemove: clearGeo })
  if (search.minPrice) activeFilters.push({ label: `Min ₹${search.minPrice}`, onRemove: () => { setMinInput(''); push({ minPrice: undefined }) } })
  if (search.maxPrice) activeFilters.push({ label: `Max ₹${search.maxPrice}`, onRemove: () => { setMaxInput(''); push({ maxPrice: undefined }) } })

  const hasFilters = activeFilters.length > 0

  return (
    <main className="page-wrap px-4 pb-16 pt-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="island-kicker mb-1">Discover</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Browse Listings
        </h1>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <div className="island-shell mb-6 rounded-2xl p-4 sm:p-5">

        {/* Row 1: Search + City */}
        <div className="flex flex-wrap gap-3">
          {/* Keyword search */}
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--sea-ink-soft)]">
              🔍
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search items…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-9 pr-4 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.2)]"
            />
          </div>

          {/* City filter */}
          <div className="relative min-w-[140px]">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--sea-ink-soft)]">
              🏙️
            </span>
            <input
              type="text"
              placeholder="City…"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-9 pr-4 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.2)]"
            />
          </div>

          {/* Price range */}
          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[var(--sea-ink-soft)]">₹</span>
              <input
                type="number"
                placeholder="Min"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                onBlur={submitSearch}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                className="w-full rounded-full border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-7 pr-3 text-sm outline-none focus:border-[var(--lagoon)]"
              />
            </div>
            <span className="text-xs text-[var(--sea-ink-soft)]">–</span>
            <div className="relative w-24">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[var(--sea-ink-soft)]">₹</span>
              <input
                type="number"
                placeholder="Max"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                onBlur={submitSearch}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                className="w-full rounded-full border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-7 pr-3 text-sm outline-none focus:border-[var(--lagoon)]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={submitSearch}
            className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)]"
          >
            Search
          </button>
        </div>

        {/* Row 2: Category pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => push({ categoryId: undefined })}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5',
              !search.categoryId
                ? 'border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)] text-white'
                : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)]',
            ].join(' ')}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => push({ categoryId: search.categoryId === c.id ? undefined : c.id })}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5',
                search.categoryId === c.id
                  ? 'border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)] text-white'
                  : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] hover:border-[var(--lagoon)] hover:text-[var(--sea-ink)]',
              ].join(' ')}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Row 3: Hyper-local geo controls */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3">
          <span className="text-xs font-semibold text-[var(--sea-ink-soft)]">
            📍 Hyper-local:
          </span>

          {!search.lat ? (
            <button
              type="button"
              onClick={requestGeo}
              disabled={geoLoading}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.1)] px-4 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.2)] disabled:opacity-60"
            >
              {geoLoading ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--lagoon-deep)] border-t-transparent" />
                  Detecting…
                </>
              ) : (
                <>📡 Use my location</>
              )}
            </button>
          ) : (
            <>
              {/* Active geo — radius selector */}
              <div className="flex items-center gap-1 rounded-full border border-[var(--lagoon)] bg-[rgba(79,184,178,0.08)] p-0.5">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => push({ radiusKm: r })}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold transition',
                      (search.radiusKm ?? 10) === r
                        ? 'bg-[var(--lagoon-deep)] text-white'
                        : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]',
                    ].join(' ')}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={clearGeo}
                className="text-xs text-[var(--sea-ink-soft)] hover:underline"
              >
                ✕ Clear location
              </button>
            </>
          )}

          {geoError && (
            <p className="text-xs text-red-500">{geoError}</p>
          )}
        </div>
      </div>

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--sea-ink-soft)]">Filters:</span>
          {activeFilters.map((f) => (
            <span
              key={f.label}
              className="flex items-center gap-1.5 rounded-full border border-[var(--lagoon)] bg-[rgba(79,184,178,0.1)] px-3 py-1 text-xs font-semibold text-[var(--lagoon-deep)]"
            >
              {f.label}
              <button
                type="button"
                onClick={f.onRemove}
                className="ml-0.5 text-[var(--lagoon-deep)] opacity-70 hover:opacity-100"
                aria-label={`Remove filter ${f.label}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[var(--sea-ink-soft)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result.data.length === 0 ? (
        <div className="island-shell rounded-2xl p-12 text-center">
          <p className="text-5xl">🔍</p>
          <p className="mt-3 text-lg font-semibold text-[var(--sea-ink)]">
            No listings found
          </p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            {search.lat
              ? `Nothing within ${search.radiusKm ?? 10} km. Try a larger radius.`
              : 'Try adjusting your search or filters.'}
          </p>
          {search.lat && (
            <button
              type="button"
              onClick={() => push({ radiusKm: (search.radiusKm ?? 10) * 2 })}
              className="mt-4 rounded-full bg-[var(--lagoon-deep)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--lagoon)]"
            >
              Expand to {(search.radiusKm ?? 10) * 2} km
            </button>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 block w-full text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
            >
              Clear all filters →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Result count + sort hint */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--sea-ink-soft)]">
              <strong className="text-[var(--sea-ink)]">{result.meta.total}</strong>{' '}
              listing{result.meta.total !== 1 ? 's' : ''} found
              {search.lat ? ` within ${search.radiusKm ?? 10} km` : ''}
              {search.city ? ` in ${search.city}` : ''}
            </p>
            {search.lat && (
              <span className="flex items-center gap-1 rounded-full bg-[rgba(79,184,178,0.12)] px-3 py-1 text-xs font-semibold text-[var(--lagoon-deep)]">
                📡 Sorted by distance
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {result.data.map((item) => (
              <Link
                key={item.id}
                to="/listings/$id"
                params={{ id: item.id }}
                className="island-shell feature-card group block overflow-hidden rounded-2xl border border-[var(--line)] no-underline"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--sand)]">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">📦</div>
                  )}
                  {/* Category badge */}
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    {item.category.icon} {item.category.name}
                  </span>
                  {/* Nearby badge */}
                  {search.lat && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--lagoon-deep)]/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      📍 Nearby
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-[var(--sea-ink)]">
                    {item.title}
                  </h3>
                  <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                    📍 {item.city}{item.state ? `, ${item.state}` : ''}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--lagoon-deep)]">
                      ₹{Number(item.pricePerDay).toFixed(0)}
                      <span className="font-normal text-[var(--sea-ink-soft)]"> / day</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {item._count && item._count.reviews > 0 && (
                        <span className="text-xs text-[var(--sea-ink-soft)]">
                          ⭐ {item._count.reviews}
                        </span>
                      )}
                      {item.owner.governmentIdVerified && (
                        <span title="Verified owner" className="text-xs">🛡️</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {result.meta.pages > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => push({ page: Math.max(1, search.page - 1) })}
                disabled={search.page <= 1}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: result.meta.pages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - search.page) <= 2 || p === 1 || p === result.meta.pages)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-[var(--sea-ink-soft)]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => push({ page: p as number })}
                      className={[
                        'rounded-full px-4 py-2 text-sm font-semibold transition',
                        p === search.page
                          ? 'bg-[var(--lagoon-deep)] text-white'
                          : 'border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] hover:-translate-y-0.5',
                      ].join(' ')}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => push({ page: Math.min(result.meta.pages, search.page + 1) })}
                disabled={search.page >= result.meta.pages}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
