import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { bookings as bookingsApi, type Booking, admin, auth, categories, type AdminListing, type Category } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import AdminPanel from '../components/AdminPanel'

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
  component: DashboardPage,
})

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-[var(--sand)] text-[var(--text-soft)] border-[var(--line)]',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  DISPUTED: 'bg-orange-100 text-orange-800 border-orange-200',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ' + cls}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({
  bookingId,
  targetStatus,
  label,
  className,
  onSuccess,
}: {
  bookingId: string
  targetStatus: string
  label: string
  className?: string
  onSuccess: (id: string, status: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await bookingsApi.updateStatus(bookingId, targetStatus)
      onSuccess(bookingId, targetStatus)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={'rounded-full px-4 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-60 ' + (className ?? '')}
    >
      {loading ? 'Updating…' : label}
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysRemaining(endDate: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000),
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatINR(amount: number): string {
  return '\u20b9' + amount.toLocaleString('en-IN')
}

// ── Main component ────────────────────────────────────────────────────────────

function DashboardPage() {
  const { mine, ownerBookings: ownerData, myListings: initialListings, cats } = Route.useLoaderData()
  const { user, isAuthenticated, initializing, clearAuth } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [activeTab, setActiveTab] = useState<'renter' | 'provider' | 'history' | 'admin'>('renter')
  const [bookingsList, setBookingsList] = useState<Booking[]>(mine)
  const [ownerList, setOwnerList] = useState<Booking[]>(ownerData)

  // Wait for silent refresh to complete before deciding to redirect.
  // Without this guard, the page redirects to /auth/login on every refresh
  // because the access token hasn't been restored from the cookie yet.
  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Restoring session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    navigate({ to: '/auth/login' })
    return null
  }

  // ── Derived counts ──────────────────────────────────────────────────────────
  const activeRents = bookingsList.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED',
  ).length

  const itemsOut = ownerList.filter((b) => b.status === 'ACTIVE').length

  const pendingRequests = ownerList.filter((b) => b.status === 'PENDING').length

  const totalEarned = ownerList
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.totalPrice), 0)

  // ── State updater ───────────────────────────────────────────────────────────
  function handleStatusUpdate(id: string, status: string) {
    setBookingsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    )
    setOwnerList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    )
  }

  // ── Sections ────────────────────────────────────────────────────────────────
  const renterActive = bookingsList.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED',
  )
  const renterPending = bookingsList.filter((b) => b.status === 'PENDING')

  const providerActive = ownerList.filter((b) => b.status === 'ACTIVE')
  const providerPending = ownerList.filter((b) => b.status === 'PENDING')
  const providerConfirmed = ownerList.filter((b) => b.status === 'CONFIRMED')

  const historyItems = [
    ...bookingsList
      .filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED')
      .map((b) => ({ ...b, role: 'Rented' as const })),
    ...ownerList
      .filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED')
      .map((b) => ({ ...b, role: 'Lent' as const })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <main className="page-wrap px-4 pb-20 pt-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="island-kicker mb-1">Dashboard</p>
          <h1 className="display-title text-3xl font-bold text-[var(--text-dark)]">
            Welcome back, {user?.name?.split(' ')[0]}
            {isSuperAdmin && (
              <span className="ml-2 rounded-full bg-purple-600 px-2.5 py-0.5 text-sm font-semibold text-white">
                Super Admin
              </span>
            )}
            {user?.role === 'ADMIN' && !isSuperAdmin && (
              <span className="ml-2 rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-sm font-semibold text-white">
                Admin
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Manage your rentals and listings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/listings/new"
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:-translate-y-0.5 hover:bg-[var(--brand-light)]"
          >
            + List an Item
          </Link>
          <button
            onClick={async () => {
              try { await auth.logout() } catch { /* ignore */ }
              clearAuth()
              navigate({ to: '/', search: { accessDenied: undefined } })
            }}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:border-red-300 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active Rents', value: activeRents, icon: '��' },
          { label: 'Items Out', value: itemsOut, icon: '📦' },
          { label: 'Pending Requests', value: pendingRequests, icon: '⏳' },
          {
            label: 'Total Earned',
            value: formatINR(totalEarned),
            icon: '💰',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="island-shell rounded-2xl p-5"
          >
            <p className="mb-1 text-2xl">{stat.icon}</p>
            <p className="text-xl font-bold text-[var(--text-dark)]">
              {stat.value}
            </p>
            <p className="text-xs text-[var(--text-soft)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Trust & Verification ────────────────────────────────────────────── */}
      <div className="island-shell mb-8 rounded-2xl p-5">
        <p className="island-kicker mb-3">Trust &amp; Verification</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <VerifyCard
            icon="✉️"
            label="Email"
            verified={!!user?.emailVerified}
            value={user?.email}
          />
          <VerifyCard
            icon="📞"
            label="Phone"
            verified={!!user?.phoneVerified}
            value={user?.phone ?? 'Not added'}
          />
          <VerifyCard
            icon="📍"
            label="Neighbourhood"
            verified={!!user?.neighborhood}
            value={user?.neighborhood ?? 'Not added'}
          />
          <VerifyCard
            icon="🛡️"
            label="Govt ID"
            verified={!!user?.governmentIdVerified}
            value={user?.governmentIdVerified ? 'Verified' : 'Not verified'}
          />
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
        {(
          [
            { id: 'renter', label: 'My Rentals', count: activeRents },
            { id: 'provider', label: 'Items Out on Rent', count: itemsOut },
            { id: 'history', label: 'History', count: null },
            ...(isAdmin ? [{ id: 'admin', label: '⚙️ Admin Panel', count: null }] : []),
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ' +
              (activeTab === tab.id
                ? tab.id === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-[var(--brand)] text-white shadow-sm'
                : 'text-[var(--text-soft)] hover:text-[var(--text-dark)]')
            }
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span
                className={
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold ' +
                  (activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--brand)] text-white')
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Renter Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'renter' && (
        <div className="space-y-8">
          {/* Active / Confirmed */}
          {renterActive.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-dark)]">
                Active Rentals
              </h2>
              <div className="space-y-4">
                {renterActive.map((b) => {
                  const days = daysRemaining(b.endDate)
                  return (
                    <div key={b.id} className="island-shell rounded-2xl p-5">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                          {b.listing.images[0] ? (
                            <img
                              src={b.listing.images[0]}
                              alt={b.listing.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-3xl">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[var(--text-dark)]">
                                {b.listing.title}
                              </p>
                              <p className="text-xs text-[var(--text-soft)]">
                                📍 {b.listing.city}
                              </p>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-soft)]">
                            {formatDate(b.startDate)} → {formatDate(b.endDate)}
                          </p>
                          {b.status === 'ACTIVE' && (
                            <p className="mt-1 text-xs font-semibold text-green-700">
                              ⏱ {days} day{days !== 1 ? 's' : ''} remaining
                            </p>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <p className="mt-1 text-xs text-blue-600">
                              🤝 Awaiting handover from owner
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-bold text-[var(--text-dark)]">
                              {formatINR(Number(b.totalPrice))}
                            </span>
                            {b.listing.securityDeposit &&
                              Number(b.listing.securityDeposit) > 0 && (
                                <span className="text-xs text-[var(--text-soft)]">
                                  🔒 {formatINR(Number(b.listing.securityDeposit))} deposit
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="island-shell rounded-2xl p-10 text-center">
              <p className="mb-2 text-4xl">🏠</p>
              <p className="font-semibold text-[var(--text-dark)]">
                No active rentals
              </p>
              <p className="mb-4 text-sm text-[var(--text-soft)]">
                Find something to rent nearby
              </p>
              <Link
                to="/listings"
                className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:-translate-y-0.5"
              >
                Browse listings
              </Link>
            </div>
          )}

          {/* Pending */}
          {renterPending.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-dark)]">
                Pending Requests
              </h2>
              <div className="space-y-4">
                {renterPending.map((b) => (
                  <div key={b.id} className="island-shell rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text-dark)]">
                          {b.listing.title}
                        </p>
                        <p className="text-xs text-[var(--text-soft)]">
                          {formatDate(b.startDate)} → {formatDate(b.endDate)}
                        </p>
                        <p className="mt-1 text-xs text-yellow-700">
                          ⏳ Awaiting owner confirmation
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[var(--text-dark)]">
                          {formatINR(Number(b.totalPrice))}
                        </span>
                        <ActionButton
                          bookingId={b.id}
                          targetStatus="CANCELLED"
                          label="Cancel"
                          className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          onSuccess={handleStatusUpdate}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Provider Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'provider' && (
        <div className="space-y-8">
          {ownerList.length === 0 ? (
            <div className="island-shell rounded-2xl p-10 text-center">
              <p className="mb-2 text-4xl">📦</p>
              <p className="font-semibold text-[var(--text-dark)]">
                No bookings for your items yet
              </p>
              <p className="mb-4 text-sm text-[var(--text-soft)]">
                List an item to start earning
              </p>
              <Link
                to="/listings/new"
                className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:-translate-y-0.5"
              >
                List an Item
              </Link>
            </div>
          ) : (
            <>
              {/* Items currently out */}
              {providerActive.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-[var(--text-dark)]">
                    Items Out on Rent
                  </h2>
                  <div className="space-y-4">
                    {providerActive.map((b) => {
                      const waPhone = b.renter?.phone?.replace(/\D/g, '') ?? ''
                      const waMsg = encodeURIComponent(
                        'Hi, regarding your rental of ' + b.listing.title + ' on Vastu-Rent.',
                      )
                      const waUrl = waPhone
                        ? 'https://wa.me/' + waPhone + '?text=' + waMsg
                        : null
                      return (
                        <div key={b.id} className="island-shell rounded-2xl p-5">
                          <div className="flex gap-4">
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                              {b.listing.images[0] ? (
                                <img
                                  src={b.listing.images[0]}
                                  alt={b.listing.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-3xl">
                                  📦
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[var(--text-dark)]">
                                {b.listing.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-soft)]">
                                <span>👤 {b.renter?.name ?? 'Unknown'}</span>
                                {b.renter?.phone && (
                                  <>
                                    <span>·</span>
                                    <span>{b.renter.phone}</span>
                                    {waUrl && (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#25D366] no-underline hover:underline"
                                      >
                                        💬 WhatsApp
                                      </a>
                                    )}
                                  </>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                {formatDate(b.startDate)} → {formatDate(b.endDate)}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <span className="font-bold text-[var(--text-dark)]">
                                  {formatINR(Number(b.totalPrice))}
                                </span>
                                {b.listing.securityDeposit &&
                                  Number(b.listing.securityDeposit) > 0 && (
                                    <span className="text-xs text-amber-700">
                                      🔒 Remember to refund {formatINR(Number(b.listing.securityDeposit))} deposit
                                    </span>
                                  )}
                              </div>
                              <div className="mt-3">
                                <ActionButton
                                  bookingId={b.id}
                                  targetStatus="COMPLETED"
                                  label="Return Confirmed"
                                  className="bg-[var(--brand)] text-white hover:bg-[var(--brand-light)]"
                                  onSuccess={handleStatusUpdate}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Pending requests */}
              {providerPending.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-[var(--text-dark)]">
                    Pending Requests
                  </h2>
                  <div className="space-y-4">
                    {providerPending.map((b) => (
                      <div key={b.id} className="island-shell rounded-2xl p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--text-dark)]">
                              {b.listing.title}
                            </p>
                            <p className="text-xs text-[var(--text-soft)]">
                              👤 {b.renter?.name ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-[var(--text-soft)]">
                              {formatDate(b.startDate)} → {formatDate(b.endDate)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[var(--text-dark)]">
                              {formatINR(Number(b.totalPrice))}
                            </span>
                            <ActionButton
                              bookingId={b.id}
                              targetStatus="CONFIRMED"
                              label="Confirm"
                              className="bg-[var(--brand)] text-white hover:bg-[var(--brand-light)]"
                              onSuccess={handleStatusUpdate}
                            />
                            <ActionButton
                              bookingId={b.id}
                              targetStatus="CANCELLED"
                              label="Decline"
                              className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                              onSuccess={handleStatusUpdate}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Confirmed but not yet active */}
              {providerConfirmed.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-[var(--text-dark)]">
                    Confirmed — Awaiting Handover
                  </h2>
                  <div className="space-y-4">
                    {providerConfirmed.map((b) => (
                      <div key={b.id} className="island-shell rounded-2xl p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--text-dark)]">
                              {b.listing.title}
                            </p>
                            <p className="text-xs text-[var(--text-soft)]">
                              👤 {b.renter?.name ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-[var(--text-soft)]">
                              {formatDate(b.startDate)} → {formatDate(b.endDate)}
                            </p>
                          </div>
                          <ActionButton
                            bookingId={b.id}
                            targetStatus="ACTIVE"
                            label="Mark as Active"
                            className="bg-green-600 text-white hover:bg-green-500"
                            onSuccess={handleStatusUpdate}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {historyItems.length === 0 ? (
            <div className="island-shell rounded-2xl p-10 text-center">
              <p className="mb-2 text-4xl">📋</p>
              <p className="font-semibold text-[var(--text-dark)]">
                No history yet
              </p>
              <p className="text-sm text-[var(--text-soft)]">
                Completed and cancelled bookings will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((b) => (
                <div
                  key={b.id + b.role}
                  className="island-shell flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--sand)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-soft)]">
                      {b.role}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-dark)]">
                        {b.listing.title}
                      </p>
                      <p className="text-xs text-[var(--text-soft)]">
                        {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--text-dark)]">
                      {formatINR(Number(b.totalPrice))}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Admin Panel Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'admin' && isAdmin && (
        <AdminPanel
          initialListings={initialListings}
          cats={cats}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </main>
  )
}

// ── VerifyCard ────────────────────────────────────────────────────────────────

function VerifyCard({
  icon,
  label,
  verified,
  value,
}: {
  icon: string
  label: string
  verified: boolean
  value?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-[var(--text-dark)]">
          {label}
        </span>
        {verified ? (
          <span className="ml-auto text-[10px] font-bold text-green-600">
            ✓
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-[var(--text-soft)]">
            —
          </span>
        )}
      </div>
      {value && (
        <p className="mt-1 truncate text-[11px] text-[var(--text-soft)]">
          {value}
        </p>
      )}
    </div>
  )
}