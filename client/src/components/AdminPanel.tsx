import { useEffect, useRef, useState } from 'react'
import { admin, categories, uploads, type AdminListing, type Category, type CreateListingInput } from '../lib/api'
import SuperAdminPanel from './SuperAdminPanel'

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.25)]'

// ── Status badge ──────────────────────────────────────────────────────────────

function ListingStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-green-100 text-green-800 border-green-200'
      : status === 'PAUSED'
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : status === 'DRAFT'
          ? 'bg-orange-100 text-orange-700 border-orange-200'
          : 'bg-gray-100 text-gray-600 border-gray-200'
  const label =
    status === 'DRAFT' ? '⏳ Pending Approval' : status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <span className={'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ' + cls}>
      {label}
    </span>
  )
}

// ── AdminPanel ────────────────────────────────────────────────────────────────

interface AdminPanelProps {
  initialListings: AdminListing[]
  cats: Category[]
  isSuperAdmin: boolean
}

export default function AdminPanel({ initialListings, cats: initialCats, isSuperAdmin }: AdminPanelProps) {
  const [listings, setListings] = useState<AdminListing[]>(initialListings)
  const [cats, setCats] = useState<Category[]>(initialCats)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminListing | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [pricePerDay, setPricePerDay] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('India')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [tags, setTags] = useState('')
  const [minRentalDays, setMinRentalDays] = useState('1')
  const [maxRentalDays, setMaxRentalDays] = useState('30')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Load categories if not provided
  useEffect(() => {
    if (cats.length === 0) {
      categories.list().then(setCats).catch(() => {})
    }
  }, [])

  function resetForm() {
    setTitle('')
    setDescription('')
    setCategoryId('')
    setPricePerDay('')
    setSecurityDeposit('')
    setAddress('')
    setCity('')
    setState('')
    setCountry('India')
    setPostalCode('')
    setLatitude('')
    setLongitude('')
    setTags('')
    setMinRentalDays('1')
    setMaxRentalDays('30')
    setImageUrls([])
    setEditTarget(null)
    setError(null)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(listing: AdminListing) {
    setEditTarget(listing)
    setTitle(listing.title)
    setDescription(listing.description)
    setCategoryId(listing.category.id)
    setPricePerDay(String(listing.pricePerDay))
    setSecurityDeposit(listing.securityDeposit ? String(listing.securityDeposit) : '')
    setAddress(listing.address)
    setCity(listing.city)
    setState(listing.state ?? '')
    setCountry(listing.country)
    setPostalCode('')
    setLatitude(String(listing.latitude))
    setLongitude(String(listing.longitude))
    setTags(listing.tags.join(', '))
    setMinRentalDays(String(listing.minRentalDays))
    setMaxRentalDays(String(listing.maxRentalDays))
    setImageUrls(listing.images)
    setError(null)
    setShowForm(true)
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(
        Array.from(files).slice(0, 10 - imageUrls.length).map((f) =>
          uploads.uploadFile(f, 'listings'),
        ),
      )
      setImageUrls((prev) => [...prev, ...urls])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImages(false)
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const payload: CreateListingInput = {
      title: title.trim(),
      description: description.trim(),
      pricePerDay: Number(pricePerDay),
      securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
      categoryId,
      images: imageUrls,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      address: address.trim(),
      city: city.trim(),
      state: state.trim() || undefined,
      country: country.trim(),
      postalCode: postalCode.trim() || undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      minRentalDays: Number(minRentalDays),
      maxRentalDays: Number(maxRentalDays),
    }

    try {
      if (editTarget) {
        const updated = await admin.updateListing(editTarget.id, payload)
        setListings((prev) =>
          prev.map((l) => (l.id === editTarget.id ? ({ ...l, ...updated } as AdminListing) : l)),
        )
        setSuccess('Listing updated successfully.')
      } else {
        const created = await admin.createListing(payload)
        setListings((prev) => [created as AdminListing, ...prev])
        setSuccess('Listing created successfully.')
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(listing: AdminListing) {
    setTogglingId(listing.id)
    try {
      const newStatus = listing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const updated = await admin.toggleStatus(listing.id, newStatus)
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, status: updated.status } : l)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await admin.deleteListing(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete listing')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Super Admin gets the full control center ─────────────────────────── */}
      {isSuperAdmin && <SuperAdminPanel />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--sea-ink)]">
            ⚙️ My Listings
          </h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {isSuperAdmin
              ? 'Your own listings — new ones go live immediately'
              : 'New listings need Super Admin approval before going live'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)]"
        >
          + Add New Product
        </button>
      </div>

      {/* ── Feedback ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ── Add / Edit Form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="island-shell rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--sea-ink)]">
              {editTarget ? '✏️ Edit Listing' : '➕ Add New Product'}
            </h3>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink-soft)] hover:text-red-600"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Honda Generator 2kW"
                className={inputCls}
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a category…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                minLength={20}
                maxLength={500}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item, its condition, and what's included…"
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                  Rental Price / Day (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-[var(--sea-ink-soft)]">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    placeholder="0.00"
                    className={inputCls + ' pl-8'}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                  Security Deposit (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-[var(--sea-ink-soft)]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="0.00"
                    className={inputCls + ' pl-8'}
                  />
                </div>
              </div>
            </div>

            {/* Rental duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">Min Rental Days</label>
                <input type="number" min="1" max="365" value={minRentalDays} onChange={(e) => setMinRentalDays(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">Max Rental Days</label>
                <input type="number" min="1" max="365" value={maxRentalDays} onChange={(e) => setMaxRentalDays(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="generator, power, honda (comma-separated)"
                className={inputCls}
              />
            </div>

            {/* Images */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
                Photos <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || imageUrls.length >= 10}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--lagoon)] bg-[rgba(79,184,178,0.06)] px-4 py-4 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.12)] disabled:opacity-50"
              >
                {uploadingImages ? '⏳ Uploading…' : '📷 Upload Photos'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />
              {imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imageUrls.map((url, i) => (
                    <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--line)]">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-sm font-semibold text-[var(--sea-ink)]">📍 Location</p>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street Address *" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" className={inputCls} />
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country *" className={inputCls} />
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal Code" className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input type="number" required step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude *" className={inputCls} />
                <input type="number" required step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude *" className={inputCls} />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  title="Use my location"
                  className="shrink-0 rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.2)] disabled:opacity-60"
                >
                  {geoLoading ? '⏳' : '📡'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="rounded-full border border-[var(--line)] px-6 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:-translate-y-0.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || imageUrls.length === 0}
                className="rounded-full bg-[var(--lagoon-deep)] px-8 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Saving…' : editTarget ? '💾 Save Changes' : '🚀 Publish Listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── My Listings Table ────────────────────────────────────────────────── */}
      <div className="island-shell rounded-2xl overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h3 className="font-semibold text-[var(--sea-ink)]">
            My Listings ({listings.filter((l) => l.status !== 'DELETED').length})
          </h3>
        </div>

        {listings.filter((l) => l.status !== 'DELETED').length === 0 ? (
          <div className="p-10 text-center">
            <p className="mb-2 text-4xl">📦</p>
            <p className="font-semibold text-[var(--sea-ink)]">No listings yet</p>
            <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">Add your first product to start earning</p>
            <button
              onClick={openCreate}
              className="rounded-full bg-[var(--lagoon-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {listings
              .filter((l) => l.status !== 'DELETED')
              .map((listing) => (
                <div key={listing.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  {/* Thumbnail */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
                    {listing.images[0] ? (
                      <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-[var(--sea-ink)]">{listing.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
                      <span>{listing.category.icon} {listing.category.name}</span>
                      <span>·</span>
                      <span>₹{Number(listing.pricePerDay).toLocaleString('en-IN')}/day</span>
                      {listing.securityDeposit && Number(listing.securityDeposit) > 0 && (
                        <>
                          <span>·</span>
                          <span>🔒 ₹{Number(listing.securityDeposit).toLocaleString('en-IN')} deposit</span>
                        </>
                      )}
                      <span>·</span>
                      <span>📍 {listing.city}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
                      <span>📦 {listing._count.bookings} bookings</span>
                      <span>·</span>
                      <span>⭐ {listing._count.reviews} reviews</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <ListingStatusBadge status={listing.status} />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Toggle Available / Paused */}
                    <button
                      onClick={() => handleToggleStatus(listing)}
                      disabled={togglingId === listing.id}
                      title={listing.status === 'ACTIVE' ? 'Mark as Paused' : 'Mark as Available'}
                      className={
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-60 ' +
                        (listing.status === 'ACTIVE'
                          ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100')
                      }
                    >
                      {togglingId === listing.id
                        ? '…'
                        : listing.status === 'ACTIVE'
                          ? '⏸ Pause'
                          : '▶ Activate'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(listing)}
                      className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink-soft)] transition hover:-translate-y-0.5 hover:text-[var(--sea-ink)]"
                    >
                      ✏️ Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deletingId === listing.id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === listing.id ? '…' : '🗑 Delete'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
