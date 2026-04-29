import { useEffect, useState } from 'react'
import {
  admin,
  type AdminListing,
  type AdminUser,
  type Booking,
  type PlatformStats,
} from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN')
}

const BOOKING_STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  DISPUTED: 'bg-orange-100 text-orange-800 border-orange-200',
}

// ── SuperAdminPanel ───────────────────────────────────────────────────────────

type SATab = 'overview' | 'approvals' | 'bookings' | 'users'

export default function SuperAdminPanel() {
  const [tab, setTab] = useState<SATab>('overview')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [allListings, setAllListings] = useState<AdminListing[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      admin.platformStats(),
      admin.allListings(),
      admin.allBookings(),
      admin.allUsers(),
    ])
      .then(([s, l, b, u]) => {
        setStats(s)
        setAllListings(l)
        setAllBookings(b)
        setAllUsers(u)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  function flash(msg: string) {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 3500)
  }

  async function handleApprove(id: string) {
    setProcessingId(id)
    try {
      await admin.approveListing(id)
      setAllListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'ACTIVE' } : l)),
      )
      setStats((s) => s ? { ...s, pendingListings: Math.max(0, s.pendingListings - 1) } : s)
      flash('✅ Listing approved and is now live.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this listing? It will be removed.')) return
    setProcessingId(id)
    try {
      await admin.rejectListing(id)
      setAllListings((prev) => prev.filter((l) => l.id !== id))
      setStats((s) => s ? { ...s, pendingListings: Math.max(0, s.pendingListings - 1) } : s)
      flash('❌ Listing rejected and removed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleForceDelete(id: string) {
    if (!confirm('Force-delete this listing? This cannot be undone.')) return
    setProcessingId(id)
    try {
      await admin.forceDelete(id)
      setAllListings((prev) => prev.filter((l) => l.id !== id))
      flash('🗑 Listing deleted.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleVerifyAdmin(userId: string) {
    if (!confirm('Promote this user to ADMIN?')) return
    setProcessingId(userId)
    try {
      const updated = await admin.verifyAdmin(userId)
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      )
      flash(`✅ ${updated.name} is now an Admin.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to promote')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingListings = allListings.filter((l) => l.status === 'DRAFT')
  const activeListings = allListings.filter((l) => l.status === 'ACTIVE')

  const TABS: { id: SATab; label: string; badge?: number }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'approvals', label: '🔍 Approvals', badge: pendingListings.length },
    { id: 'bookings', label: '📋 Booking Log', badge: allBookings.length },
    { id: 'users', label: '👥 Users', badge: allUsers.length },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest opacity-70">
          God Mode
        </p>
        <h2 className="text-2xl font-bold">🛡️ Super Admin Control Center</h2>
        <p className="mt-1 text-sm opacity-80">
          Full platform visibility — approve listings, monitor bookings, manage users
        </p>
      </div>

      {/* ── Feedback ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-bold">✕</button>
        </div>
      )}
      {actionMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionMsg}
        </div>
      )}

      {/* ── Sub-tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ' +
              (tab === t.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]')
            }
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-bold ' + (tab === t.id ? 'bg-white/20 text-white' : 'bg-purple-600 text-white')}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-16 text-center text-[var(--sea-ink-soft)]">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 text-sm">Loading platform data…</p>
        </div>
      )}

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: '👤', color: 'text-blue-600' },
              { label: 'Admins / Owners', value: stats.totalAdmins, icon: '🏪', color: 'text-teal-600' },
              { label: 'Live Listings', value: stats.totalListings, icon: '📦', color: 'text-green-600' },
              { label: 'Pending Approval', value: stats.pendingListings, icon: '⏳', color: stats.pendingListings > 0 ? 'text-orange-600' : 'text-gray-400' },
              { label: 'Total Bookings', value: stats.totalBookings, icon: '📋', color: 'text-purple-600' },
            ].map((s) => (
              <div key={s.label} className="island-shell rounded-2xl p-5">
                <p className="mb-1 text-2xl">{s.icon}</p>
                <p className={'text-2xl font-bold ' + s.color}>{s.value}</p>
                <p className="text-xs text-[var(--sea-ink-soft)]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          {stats.pendingListings > 0 && (
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
              <p className="mb-1 font-semibold text-orange-800">
                ⚠️ {stats.pendingListings} listing{stats.pendingListings !== 1 ? 's' : ''} waiting for approval
              </p>
              <p className="mb-3 text-sm text-orange-700">
                New products submitted by Admins need your review before going live.
              </p>
              <button
                onClick={() => setTab('approvals')}
                className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Review Now →
              </button>
            </div>
          )}

          {/* Recent bookings summary */}
          <div className="island-shell rounded-2xl overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h3 className="font-semibold text-[var(--sea-ink)]">Recent Bookings</h3>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {allBookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--sea-ink)]">{b.listing.title}</p>
                    <p className="text-xs text-[var(--sea-ink-soft)]">
                      👤 {b.renter?.name ?? '—'} · {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--sea-ink)]">{formatINR(Number(b.totalPrice))}</span>
                    <span className={'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ' + (BOOKING_STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
              {allBookings.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[var(--sea-ink-soft)]">No bookings yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approvals Tab ────────────────────────────────────────────────────── */}
      {!loading && tab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--sea-ink)]">
              Pending Approval ({pendingListings.length})
            </h3>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              Approve to make live · Reject to remove
            </p>
          </div>

          {pendingListings.length === 0 ? (
            <div className="island-shell rounded-2xl p-10 text-center">
              <p className="mb-2 text-4xl">✅</p>
              <p className="font-semibold text-[var(--sea-ink)]">All caught up!</p>
              <p className="text-sm text-[var(--sea-ink-soft)]">No listings waiting for approval</p>
            </div>
          ) : (
            pendingListings.map((listing) => (
              <div key={listing.id} className="island-shell rounded-2xl p-5">
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                    {listing.images[0] ? (
                      <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--sea-ink)]">{listing.title}</p>
                        <p className="text-xs text-[var(--sea-ink-soft)]">
                          {listing.category.icon} {listing.category.name} · 📍 {listing.city}
                        </p>
                        <p className="text-xs text-[var(--sea-ink-soft)]">
                          Owner: {listing.owner?.name ?? '—'} ({listing.owner?.email ?? '—'})
                        </p>
                      </div>
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        Pending Review
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">
                      {listing.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
                      <span className="font-semibold text-[var(--sea-ink)]">
                        ₹{Number(listing.pricePerDay).toLocaleString('en-IN')}/day
                      </span>
                      {listing.securityDeposit && Number(listing.securityDeposit) > 0 && (
                        <span>🔒 ₹{Number(listing.securityDeposit).toLocaleString('en-IN')} deposit</span>
                      )}
                      <span>📅 {formatDate(listing.createdAt)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApprove(listing.id)}
                        disabled={processingId === listing.id}
                        className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-green-500 disabled:opacity-60"
                      >
                        {processingId === listing.id ? '…' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(listing.id)}
                        disabled={processingId === listing.id}
                        className="rounded-full border border-red-300 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-60"
                      >
                        {processingId === listing.id ? '…' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Active listings — force delete option */}
          {activeListings.length > 0 && (
            <div className="island-shell rounded-2xl overflow-hidden">
              <div className="border-b border-[var(--line)] px-5 py-4">
                <h3 className="font-semibold text-[var(--sea-ink)]">
                  All Live Listings ({activeListings.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {activeListings.map((listing) => (
                  <div key={listing.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--sand)]">
                      {listing.images[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--sea-ink)]">{listing.title}</p>
                      <p className="text-xs text-[var(--sea-ink-soft)]">
                        {listing.owner?.name ?? '—'} · ₹{Number(listing.pricePerDay).toLocaleString('en-IN')}/day · {listing.city}
                      </p>
                    </div>
                    <button
                      onClick={() => handleForceDelete(listing.id)}
                      disabled={processingId === listing.id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-60"
                    >
                      {processingId === listing.id ? '…' : '🗑 Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Booking Log Tab ──────────────────────────────────────────────────── */}
      {!loading && tab === 'bookings' && (
        <div className="island-shell rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h3 className="font-semibold text-[var(--sea-ink)]">
              All Booking Requests ({allBookings.length})
            </h3>
          </div>
          {allBookings.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--sea-ink-soft)]">No bookings yet</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {allBookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                    {b.listing.images[0] ? (
                      <img src={b.listing.images[0]} alt={b.listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--sea-ink)]">
                      {b.listing.title}
                    </p>
                    <p className="text-xs text-[var(--sea-ink-soft)]">
                      👤 {b.renter?.name ?? '—'} ({b.renter?.email ?? '—'})
                    </p>
                    <p className="text-xs text-[var(--sea-ink-soft)]">
                      📅 {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-[var(--sea-ink)]">
                      {formatINR(Number(b.totalPrice))}
                    </span>
                    <span className={'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ' + (BOOKING_STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ────────────────────────────────────────────────────────── */}
      {!loading && tab === 'users' && (
        <div className="island-shell rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h3 className="font-semibold text-[var(--sea-ink)]">
              All Users ({allUsers.length})
            </h3>
          </div>
          {allUsers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--sea-ink-soft)]">No users yet</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {allUsers.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon-deep)] text-sm font-bold text-white">
                    {u.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--sea-ink)]">{u.name}</p>
                      <span className={
                        'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (u.role === 'SUPER_ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'ADMIN'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-gray-100 text-gray-600')
                      }>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--sea-ink-soft)]">{u.email}</p>
                    <p className="text-xs text-[var(--sea-ink-soft)]">
                      �� {u._count.listings} listings · 🛒 {u._count.bookingsAsRenter} bookings · Joined {formatDate(u.createdAt)}
                    </p>
                  </div>
                  {u.role === 'USER' && (
                    <button
                      onClick={() => handleVerifyAdmin(u.id)}
                      disabled={processingId === u.id}
                      className="rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:-translate-y-0.5 hover:bg-teal-100 disabled:opacity-60"
                    >
                      {processingId === u.id ? '…' : '⬆️ Make Admin'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
