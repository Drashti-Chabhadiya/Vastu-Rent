import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, SlidersHorizontal, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Category, Listing, ListingsResponse } from '@/lib/api'
import { useGeolocation } from '@/hooks/useGeolocation'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100]

export interface ListingsSearch {
  q?:          string
  categoryId?: string
  city?:       string
  lat?:        number
  lng?:        number
  radiusKm?:   number
  minPrice?:   number
  maxPrice?:   number
  page:        number
}

interface ListingsPageProps {
  cats:   Category[]
  result: ListingsResponse
  search: ListingsSearch
  push:   (patch: Partial<ListingsSearch>) => void
  clearAll: () => void
}

export function ListingsPage({ cats, result, search, push, clearAll }: ListingsPageProps) {
  const navigate = useNavigate()
  const { lat, lng, error: geoError, loading: geoLoading, request: requestGeo } = useGeolocation()

  const [qInput,    setQInput]    = useState(search.q        ?? '')
  const [cityInput, setCityInput] = useState(search.city     ?? '')
  const [minInput,  setMinInput]  = useState(search.minPrice?.toString() ?? '')
  const [maxInput,  setMaxInput]  = useState(search.maxPrice?.toString() ?? '')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (lat !== null && lng !== null && (search.lat !== lat || search.lng !== lng)) {
      push({ lat, lng, radiusKm: search.radiusKm ?? 10 })
    }
  }, [lat, lng]) // eslint-disable-line

  function submitSearch() {
    push({
      q:        qInput.trim()  || undefined,
      city:     cityInput.trim() || undefined,
      minPrice: minInput ? Number(minInput) : undefined,
      maxPrice: maxInput ? Number(maxInput) : undefined,
    })
  }
  function clearGeo() { push({ lat: undefined, lng: undefined, radiusKm: undefined }) }
  function handleClearAll() {
    setQInput(''); setCityInput(''); setMinInput(''); setMaxInput('')
    clearAll()
  }

  const activeFilters: { label: string; onRemove: () => void }[] = []
  if (search.q)          activeFilters.push({ label: `"${search.q}"`,                    onRemove: () => push({ q: undefined }) })
  if (search.city)       activeFilters.push({ label: `📍 ${search.city}`,                onRemove: () => { setCityInput(''); push({ city: undefined }) } })
  if (search.categoryId) {
    const cat = cats.find((c) => c.id === search.categoryId)
    if (cat) activeFilters.push({ label: `${cat.icon} ${cat.name}`,                      onRemove: () => push({ categoryId: undefined }) })
  }
  if (search.lat)        activeFilters.push({ label: `📡 Within ${search.radiusKm ?? 10} km`, onRemove: clearGeo })
  if (search.minPrice)   activeFilters.push({ label: `Min ₹${search.minPrice}`,          onRemove: () => { setMinInput(''); push({ minPrice: undefined }) } })
  if (search.maxPrice)   activeFilters.push({ label: `Max ₹${search.maxPrice}`,          onRemove: () => { setMaxInput(''); push({ maxPrice: undefined }) } })
  const hasFilters = activeFilters.length > 0

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <div className="mb-6">
        <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--text-dark)' }}>Browse Rentals</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-soft)' }}>Discover furniture, decor and essentials near you</p>
      </div>

      {/* Filter panel */}
      <Card className="mb-6 border-0 shadow-sm" style={{ background: 'var(--surface-strong)', border: '1px solid var(--line)' }}>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-soft)' }} />
              <Input ref={searchRef} type="search" placeholder="Search items…" value={qInput} onChange={(e) => setQInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} className="pl-9" />
            </div>
            <div className="relative min-w-[140px]">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-soft)' }} />
              <Input type="text" placeholder="City…" value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-soft)' }}>₹</span>
                <Input type="number" placeholder="Min" value={minInput} onChange={(e) => setMinInput(e.target.value)} onBlur={submitSearch} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} className="pl-7" />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-soft)' }}>–</span>
              <div className="relative w-24">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-soft)' }}>₹</span>
                <Input type="number" placeholder="Max" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} onBlur={submitSearch} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} className="pl-7" />
              </div>
            </div>
            <Button onClick={submitSearch} className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Search</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => push({ categoryId: undefined })} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
              style={!search.categoryId ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' } : { background: 'var(--warm-white)', color: 'var(--text-soft)', borderColor: 'var(--line)' }}>
              All
            </button>
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={() => push({ categoryId: search.categoryId === c.id ? undefined : c.id })} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                style={search.categoryId === c.id ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' } : { background: 'var(--warm-white)', color: 'var(--text-soft)', borderColor: 'var(--line)' }}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          <Separator style={{ background: 'var(--line)' }} />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-soft)' }}>�� Hyper-local:</span>
            {!search.lat ? (
              <Button variant="secondary" size="sm" onClick={requestGeo} disabled={geoLoading} className="gap-1.5 rounded-full text-xs">
                {geoLoading ? <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} /> Detecting…</> : <>📡 Use my location</>}
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-1 rounded-full border p-0.5" style={{ borderColor: 'var(--brand)' }}>
                  {RADIUS_OPTIONS.map((r) => (
                    <button key={r} type="button" onClick={() => push({ radiusKm: r })} className="rounded-full px-3 py-1 text-xs font-semibold transition"
                      style={(search.radiusKm ?? 10) === r ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-soft)' }}>
                      {r} km
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={clearGeo} className="h-7 gap-1 rounded-full text-xs"><X className="h-3 w-3" /> Clear location</Button>
              </>
            )}
            {geoError && <p className="text-xs text-red-500">{geoError}</p>}
          </div>
        </CardContent>
      </Card>

      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-soft)' }}>Filters:</span>
          {activeFilters.map((f) => (
            <Badge key={f.label} variant="outline" className="gap-1.5 rounded-full cursor-pointer"
              style={{ borderColor: 'rgba(139,69,19,0.3)', background: 'rgba(139,69,19,0.08)', color: 'var(--brand)' }}>
              {f.label}
              <button type="button" onClick={f.onRemove} className="opacity-70 hover:opacity-100" aria-label={`Remove ${f.label}`}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 rounded-full text-xs">Clear all</Button>
        </div>
      )}

      {result.data.length === 0 ? (
        <Card className="border-0 p-12 text-center" style={{ background: 'var(--surface-strong)', border: '1px solid var(--line)' }}>
          <p className="text-5xl">🔍</p>
          <p className="mt-3 text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>No listings found</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-soft)' }}>
            {search.lat ? `Nothing within ${search.radiusKm ?? 10} km. Try a larger radius.` : 'Try adjusting your search or filters.'}
          </p>
          {hasFilters && <Button variant="link" onClick={handleClearAll} className="mt-3">Clear all filters →</Button>}
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              <strong style={{ color: 'var(--text-dark)' }}>{result.meta.total}</strong>{' '}
              item{result.meta.total !== 1 ? 's' : ''} found{search.city ? ` in ${search.city}` : ''}
            </p>
            {search.lat && <Badge variant="secondary" className="gap-1 rounded-full text-xs" style={{ background: 'rgba(139,69,19,0.08)', color: 'var(--brand)' }}>📡 Sorted by distance</Badge>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((item) => <ListingBrowseCard key={item.id} item={item} showNearby={!!search.lat} />)}
          </div>

          {result.meta.pages > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => push({ page: Math.max(1, search.page - 1) })} disabled={search.page <= 1}>← Prev</Button>
              {Array.from({ length: result.meta.pages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - search.page) <= 2 || p === 1 || p === result.meta.pages)
                .reduce<(number | '…')[]>((acc, p, i, arr) => { if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…'); acc.push(p); return acc }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e-${i}`} className="px-2 py-2 text-sm" style={{ color: 'var(--text-soft)' }}>…</span>
                  : <Button key={p} size="sm" variant={p === search.page ? 'default' : 'secondary'} onClick={() => push({ page: p as number })}>{p}</Button>
                )}
              <Button variant="secondary" size="sm" onClick={() => push({ page: Math.min(result.meta.pages, search.page + 1) })} disabled={search.page >= result.meta.pages}>Next →</Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ListingBrowseCard({ item, showNearby }: { item: Listing; showNearby: boolean }) {
  const isRentedOut = item.status === 'RENTED' || item.status === 'UNAVAILABLE'
  return (
    <a href={`/listings/${item.id}`} className="group block no-underline">
      <Card className="feature-card overflow-hidden border-0">
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--sand)' }}>
          {item.images[0]
            ? <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            : <div className="flex h-full items-center justify-center text-4xl">🛋️</div>}
          <span className="cat-pill absolute left-2.5 top-2.5">{item.category.name}</span>
          {isRentedOut && <Badge variant="destructive" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 uppercase tracking-wide text-[10px]">Rented Out</Badge>}
          {showNearby && <Badge className="absolute right-2.5 top-2.5 text-[10px]" style={{ background: 'rgba(139,69,19,0.85)' }}>📍 Nearby</Badge>}
        </div>
        <CardContent className="p-4">
          <h3 className="mb-1 line-clamp-2 text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{item.title}</h3>
          <p className="mb-2 text-xs" style={{ color: 'var(--text-soft)' }}>by {item.owner.name}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-dark)' }}>
                ₹{Number(item.pricePerDay).toFixed(0)}<span className="font-normal text-xs" style={{ color: 'var(--text-soft)' }}>/day</span>
              </p>
              {item.securityDeposit && Number(item.securityDeposit) > 0 && <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Deposit ₹{Number(item.securityDeposit).toLocaleString('en-IN')}</p>}
            </div>
            <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: 'var(--brand)' }}>View <ArrowRight className="h-3 w-3" /></span>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}
