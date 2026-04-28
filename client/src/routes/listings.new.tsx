import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { categories, listings } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/listings/new')({
  loader: () => categories.list(),
  component: NewListingPage,
})

function NewListingPage() {
  const cats = Route.useLoaderData()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    pricePerDay: '',
    categoryId: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    minRentalDays: '1',
    maxRentalDays: '30',
    tags: '',
    images: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthenticated) {
    navigate({ to: '/auth/login' })
    return null
  }

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const listing = await listings.create({
        title: form.title,
        description: form.description,
        pricePerDay: Number(form.pricePerDay),
        categoryId: form.categoryId,
        address: form.address,
        city: form.city,
        state: form.state || undefined,
        country: form.country,
        postalCode: form.postalCode || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        minRentalDays: Number(form.minRentalDays),
        maxRentalDays: Number(form.maxRentalDays),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        images: form.images
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean),
      })
      navigate({ to: '/listings/$id', params: { id: listing.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)]">
        List an Item
      </h1>

      <form
        onSubmit={handleSubmit}
        className="island-shell grid gap-6 rounded-2xl p-6 sm:p-8 lg:grid-cols-2"
      >
        {/* Title */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Title *
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. DeWalt Power Drill Set"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Description *
          </label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the item, its condition, and what's included…"
            className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Category *
          </label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none"
          >
            <option value="">Select a category</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Price per day ($) *
          </label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.pricePerDay}
            onChange={(e) => set('pricePerDay', e.target.value)}
            placeholder="25.00"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {/* Min / Max rental days */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Min rental days
          </label>
          <input
            type="number"
            min="1"
            value={form.minRentalDays}
            onChange={(e) => set('minRentalDays', e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Max rental days
          </label>
          <input
            type="number"
            min="1"
            value={form.maxRentalDays}
            onChange={(e) => set('maxRentalDays', e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {/* Location */}
        <div className="lg:col-span-2">
          <p className="island-kicker mb-3">Location</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street address"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
            <input
              required
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="City"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
            <input
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              placeholder="State / Province"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
            <input
              required
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              placeholder="Country"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
            <input
              required
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="Latitude (e.g. 40.7128)"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
            <input
              required
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="Longitude (e.g. -74.0060)"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
            💡 Tip: use{' '}
            <a
              href="https://www.latlong.net"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              latlong.net
            </a>{' '}
            to find coordinates. Mapbox geocoding integration coming soon.
          </p>
        </div>

        {/* Images */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Image URLs (one per line) *
          </label>
          <textarea
            required
            rows={3}
            value={form.images}
            onChange={(e) => set('images', e.target.value)}
            placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
            className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {/* Tags */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
            Tags (comma-separated)
          </label>
          <input
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="drill, power tools, dewalt"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
          />
        </div>

        {error && (
          <div className="lg:col-span-2">
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--lagoon-deep)] px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:opacity-60"
          >
            {submitting ? 'Publishing…' : 'Publish listing'}
          </button>
        </div>
      </form>
    </main>
  )
}
