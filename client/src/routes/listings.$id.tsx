import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { listings, bookings, messages as messagesApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/listings/$id')({
  loader: ({ params }) => listings.get(params.id),
  component: ListingDetailPage,
})

function ListingDetailPage() {
  const listing = Route.useLoaderData()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [startingChat, setStartingChat] = useState(false)

  const isOwner = user?.id === listing.owner.id

  const days =
    startDate && endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              86_400_000,
          ),
        )
      : 0

  const totalPrice = days * Number(listing.pricePerDay)

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' })
      return
    }
    setBooking(true)
    setError(null)
    try {
      await bookings.create({
        listingId: listing.id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  async function handleMessage() {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' })
      return
    }
    setStartingChat(true)
    try {
      const conv = await messagesApi.startConversation({
        recipientId: listing.owner.id,
        listingId: listing.id,
      })
      navigate({ to: '/messages/$id', params: { id: conv.id } })
    } catch (err) {
      console.error(err)
    } finally {
      setStartingChat(false)
    }
  }

  const avgRating =
    listing.reviews && listing.reviews.length > 0
      ? (
          listing.reviews.reduce(
            (s: number, r: { rating: number }) => s + r.rating,
            0,
          ) / listing.reviews.length
        ).toFixed(1)
      : null

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div>
          {/* Image gallery */}
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--sand)]">
            <div className="aspect-[16/9] w-full overflow-hidden">
              {listing.images[activeImage] ? (
                <img
                  src={listing.images[activeImage]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">
                  📦
                </div>
              )}
            </div>
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {listing.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      i === activeImage
                        ? 'border-[var(--lagoon-deep)]'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="mt-6">
            <p className="island-kicker mb-2">{listing.category.name}</p>
            <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)]">
              {listing.title}
            </h1>
            <p className="mb-1 text-sm text-[var(--sea-ink-soft)]">
              📍 {listing.city}
              {listing.state ? `, ${listing.state}` : ''}, {listing.country}
            </p>
            {avgRating && (
              <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
                ⭐ {avgRating} ({listing._count?.reviews} reviews)
              </p>
            )}
            <p className="text-base leading-relaxed text-[var(--sea-ink-soft)]">
              {listing.description}
            </p>

            {listing.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="island-shell mt-6 flex items-center gap-4 rounded-2xl p-5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--lagoon)] text-white font-bold text-lg">
              {listing.owner.avatarUrl ? (
                <img
                  src={listing.owner.avatarUrl}
                  alt={listing.owner.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                listing.owner.name[0]
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--sea-ink)] flex items-center gap-2">
                {listing.owner.name}
                {listing.owner.governmentIdVerified && (
                  <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full" title="Government ID Verified">
                    🛡️ Verified ID
                  </span>
                )}
              </p>
              <div className="flex gap-1 text-[10px] text-[var(--sea-ink-soft)]">
                Item owner • 
                <span className={listing.owner.phoneVerified ? "text-green-600" : "text-gray-400"}>📞 Phone</span> • 
                <span className={listing.owner.emailVerified ? "text-green-600" : "text-gray-400"}>✉️ Email</span>
              </div>
            </div>
            {!isOwner && isAuthenticated && (
              <button
                onClick={handleMessage}
                disabled={startingChat}
                className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-(--lagoon-deep) transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {startingChat ? 'Opening…' : 'Message'}
              </button>
            )}
          </div>

          {/* Reviews */}
          {listing.reviews && listing.reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
                Reviews
              </h2>
              <div className="space-y-4">
                {listing.reviews.map(
                  (review: {
                    id: string
                    rating: number
                    comment?: string
                    createdAt: string
                    author: { id: string; name: string; avatarUrl?: string }
                  }) => (
                    <div
                      key={review.id}
                      className="island-shell rounded-2xl p-5"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lagoon)] text-sm font-bold text-white">
                          {review.author.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--sea-ink)]">
                            {review.author.name}
                          </p>
                          <p className="text-xs text-[var(--sea-ink-soft)]">
                            {'⭐'.repeat(review.rating)}
                          </p>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column – booking card ──────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="island-shell rounded-2xl p-6">
            <p className="mb-1 text-2xl font-bold text-[var(--lagoon-deep)]">
              ${Number(listing.pricePerDay).toFixed(2)}
              <span className="text-base font-normal text-[var(--sea-ink-soft)]">
                {' '}
                / day
              </span>
            </p>
            <p className="mb-4 text-xs text-[var(--sea-ink-soft)]">
              {listing.minRentalDays}–{listing.maxRentalDays} day rental
            </p>

            {isOwner ? (
              <div className="rounded-xl bg-[var(--sand)] p-4 text-center text-sm text-[var(--sea-ink-soft)]">
                This is your listing.{' '}
                <Link
                  to="/dashboard"
                  className="font-semibold text-[var(--lagoon-deep)]"
                >
                  Manage it →
                </Link>
              </div>
            ) : success ? (
              <div className="rounded-xl bg-[rgba(79,184,178,0.12)] p-4 text-center">
                <p className="text-2xl">🎉</p>
                <p className="font-semibold text-[var(--sea-ink)]">
                  Booking request sent!
                </p>
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  The owner will confirm shortly.
                </p>
                <Link
                  to="/dashboard"
                  className="mt-3 inline-block text-sm font-semibold text-[var(--lagoon-deep)]"
                >
                  View my bookings →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--sea-ink)]">
                    Start date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm outline-none focus:border-[var(--lagoon)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--sea-ink)]">
                    End date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm outline-none focus:border-[var(--lagoon)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--sea-ink)]">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any questions or special requests?"
                    className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm outline-none focus:border-[var(--lagoon)]"
                  />
                </div>

                {days > 0 && (
                  <div className="rounded-xl bg-[var(--sand)] p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--sea-ink-soft)]">
                        ${Number(listing.pricePerDay).toFixed(2)} × {days} day
                        {days !== 1 ? 's' : ''}
                      </span>
                      <span className="font-bold text-[var(--sea-ink)]">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full rounded-full bg-[var(--lagoon-deep)] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:opacity-60"
                >
                  {booking
                    ? 'Sending request…'
                    : isAuthenticated
                      ? 'Request to book'
                      : 'Sign in to book'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
