import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { bookings as bookingsApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    const [mine, ownerBookings] = await Promise.all([
      bookingsApi.mine().catch(() => []),
      bookingsApi.ownerBookings().catch(() => []),
    ])
    return { mine, ownerBookings }
  },
  component: DashboardPage,
})

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-[var(--sand)] text-[var(--sea-ink-soft)]',
  CANCELLED: 'bg-red-50 text-red-600',
  DISPUTED: 'bg-orange-100 text-orange-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const { user, isAuthenticated, clearAuth } = useAuth()
  const navigate = useNavigate()
  const { mine, ownerBookings } = Route.useLoaderData()

  if (!isAuthenticated) {
    navigate({ to: '/auth/login' })
    return null
  }

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">Dashboard</p>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)]">
            Welcome, {user?.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/listings/new"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5"
          >
            + List an Item
          </Link>
          <button
            onClick={() => {
              clearAuth()
              navigate({ to: '/' })
            }}
            className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:-translate-y-0.5"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* My rentals (as renter) */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
          My Rentals
        </h2>
        {mine.length === 0 ? (
          <div className="island-shell rounded-2xl p-8 text-center text-[var(--sea-ink-soft)]">
            <p className="text-3xl">🛒</p>
            <p className="mt-2 font-semibold">No rentals yet</p>
            <Link
              to="/listings"
              className="mt-2 inline-block text-sm font-semibold text-[var(--lagoon-deep)]"
            >
              Browse listings →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((b) => (
              <div
                key={b.id}
                className="island-shell flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                  {b.listing.images[0] ? (
                    <img
                      src={b.listing.images[0]}
                      alt={b.listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Link
                    to="/listings/$id"
                    params={{ id: b.listing.id }}
                    className="font-semibold text-[var(--sea-ink)] no-underline hover:underline"
                  >
                    {b.listing.title}
                  </Link>
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    {new Date(b.startDate).toLocaleDateString()} →{' '}
                    {new Date(b.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--lagoon-deep)]">
                    ${Number(b.totalPrice).toFixed(2)}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bookings on my listings (as owner) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
          Booking Requests
        </h2>
        {ownerBookings.length === 0 ? (
          <div className="island-shell rounded-2xl p-8 text-center text-[var(--sea-ink-soft)]">
            <p className="text-3xl">📭</p>
            <p className="mt-2 font-semibold">No booking requests yet</p>
            <Link
              to="/listings/new"
              className="mt-2 inline-block text-sm font-semibold text-[var(--lagoon-deep)]"
            >
              List an item →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ownerBookings.map((b) => (
              <div
                key={b.id}
                className="island-shell flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-[var(--sea-ink)]">
                    {b.listing.title}
                  </p>
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    Renter: {b.renter?.name} ·{' '}
                    {new Date(b.startDate).toLocaleDateString()} →{' '}
                    {new Date(b.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--lagoon-deep)]">
                    ${Number(b.totalPrice).toFixed(2)}
                  </span>
                  <StatusBadge status={b.status} />
                  {b.status === 'PENDING' && <ConfirmButton bookingId={b.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function ConfirmButton({ bookingId }: { bookingId: string }) {
  async function confirm() {
    try {
      await bookingsApi.updateStatus(bookingId, 'CONFIRMED')
      window.location.reload()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <button
      onClick={confirm}
      className="rounded-full bg-[var(--lagoon-deep)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[var(--lagoon)]"
    >
      Confirm
    </button>
  )
}
