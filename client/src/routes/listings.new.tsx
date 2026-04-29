import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { categories, listings, uploads } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/listings/new')({
  loader: () => categories.list(),
  component: NewListingPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadedImage {
  url: string
  file: File
  preview: string
  uploading: boolean
  error?: string
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 'details', label: 'Details', icon: '📝' },
  { id: 'pricing', label: 'Pricing', icon: '💰' },
  { id: 'photos', label: 'Photos', icon: '📸' },
  { id: 'location', label: 'Location', icon: '📍' },
]

// ── Component ─────────────────────────────────────────────────────────────────

function NewListingPage() {
  const cats = Route.useLoaderData()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [minRentalDays, setMinRentalDays] = useState('1')
  const [maxRentalDays, setMaxRentalDays] = useState('30')

  const [pricePerDay, setPricePerDay] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState('')

  const [images, setImages] = useState<UploadedImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('India')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) navigate({ to: '/auth/login' })
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  // ── Photo upload helpers ────────────────────────────────────────────────────

  function handleFileSelect(files: FileList | null) {
    if (!files) return
    const remaining = 10 - images.length
    const selected = Array.from(files).slice(0, remaining)

    const newImages: UploadedImage[] = selected.map((file) => ({
      url: '',
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))

    setImages((prev) => [...prev, ...newImages])

    // Upload each file to Cloudinary
    selected.forEach((file, i) => {
      const idx = images.length + i
      uploads
        .uploadFile(file, 'listings')
        .then((url) => {
          setImages((prev) =>
            prev.map((img, j) =>
              j === idx ? { ...img, url, uploading: false } : img,
            ),
          )
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setImages((prev) =>
            prev.map((img, j) =>
              j === idx ? { ...img, uploading: false, error: msg } : img,
            ),
          )
        })
    })
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const copy = [...prev]
      URL.revokeObjectURL(copy[idx].preview)
      copy.splice(idx, 1)
      return copy
    })
  }

  function moveImage(from: number, to: number) {
    setImages((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  // ── Geolocation ─────────────────────────────────────────────────────────────

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

  // ── Step validation ─────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) return title.trim().length >= 5 && description.trim().length >= 20 && !!categoryId
    if (step === 1) return Number(pricePerDay) > 0
    if (step === 2) return images.length > 0 && images.every((img) => !img.uploading && !img.error)
    return true
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdvance()) return
    setSubmitting(true)
    setError(null)

    try {
      const listing = await listings.create({
        title: title.trim(),
        description: description.trim(),
        pricePerDay: Number(pricePerDay),
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        categoryId,
        images: images.map((img) => img.url),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || undefined,
        country: country.trim(),
        postalCode: postalCode.trim() || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
        minRentalDays: Number(minRentalDays),
        maxRentalDays: Number(maxRentalDays),
      })
      navigate({ to: '/listings/$id', params: { id: listing.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLastStep = step === STEPS.length - 1

  return (
    <main className="page-wrap px-4 pb-20 pt-8">
      {/* Page header */}
      <div className="mb-8">
        <p className="island-kicker mb-1">Provider</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)]">
          List an Item
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Earn money by renting out what you own to neighbours nearby.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Step progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => i < step && setStep(i)}
                className={[
                  'flex flex-col items-center gap-1 text-xs font-semibold transition',
                  i < step ? 'cursor-pointer text-[var(--lagoon-deep)]' : '',
                  i === step ? 'text-[var(--lagoon-deep)]' : '',
                  i > step ? 'cursor-default text-[var(--sea-ink-soft)] opacity-50' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-base transition',
                    i < step
                      ? 'border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)] text-white'
                      : '',
                    i === step
                      ? 'border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)] text-white shadow-[0_0_0_4px_rgba(79,184,178,0.2)]'
                      : '',
                    i > step
                      ? 'border-[var(--line)] bg-[var(--surface-strong)]'
                      : '',
                  ].join(' ')}
                >
                  {i < step ? '✓' : s.icon}
                </span>
                <span className="hidden sm:block">{s.label}</span>
              </button>
            ))}
          </div>
          {/* Connector line */}
          <div className="relative -mt-[2.125rem] flex items-center px-[1.125rem]">
            <div className="h-0.5 w-full bg-[var(--line)]">
              <div
                className="h-full bg-[var(--lagoon-deep)] transition-all duration-500"
                style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit}>
          <div className="island-shell rounded-2xl p-6 sm:p-8">

            {/* ── Step 0: Details ─────────────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <SectionHeader icon="📝" title="Item Details" />

                <Field label="Item Name" required hint="Be specific — good titles get more views">
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. DeWalt 20V Cordless Drill Set"
                    className={inputCls}
                  />
                </Field>

                <Field label="Category" required>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {cats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={[
                          'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition hover:-translate-y-0.5',
                          categoryId === c.id
                            ? 'border-[var(--lagoon-deep)] bg-[rgba(79,184,178,0.12)] text-[var(--lagoon-deep)]'
                            : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)]',
                        ].join(' ')}
                      >
                        <span className="text-2xl">{c.icon}</span>
                        <span className="text-center leading-tight">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Description"
                  required
                  hint={`${description.length}/500 chars — describe condition, what's included, any restrictions`}
                >
                  <textarea
                    required
                    minLength={20}
                    maxLength={500}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the item, its condition, and what's included…"
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                <Field label="Tags" hint="Comma-separated keywords to help renters find your item">
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="drill, power tools, dewalt"
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Min rental days">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={minRentalDays}
                      onChange={(e) => setMinRentalDays(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Max rental days">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={maxRentalDays}
                      onChange={(e) => setMaxRentalDays(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 1: Pricing ─────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <SectionHeader icon="💰" title="Set Your Price" />

                <Field
                  label="Daily Rental Price (₹)"
                  required
                  hint="Tip: price 20–30% below replacement cost per week to attract renters"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-[var(--sea-ink-soft)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={pricePerDay}
                      onChange={(e) => setPricePerDay(e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </Field>

                <Field
                  label="Security Deposit (₹)"
                  hint="Refundable amount held until the item is returned in good condition. Leave blank for no deposit."
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-[var(--sea-ink-soft)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </Field>

                {/* Earnings preview */}
                {Number(pricePerDay) > 0 && (
                  <div className="rounded-xl bg-[var(--sand)] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                      Estimated earnings
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: '3 days', days: 3 },
                        { label: '1 week', days: 7 },
                        { label: '1 month', days: 30 },
                      ].map(({ label, days }) => (
                        <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                          <p className="text-lg font-bold text-[var(--lagoon-deep)]">
                            ₹{(Number(pricePerDay) * days).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-[var(--sea-ink-soft)]">{label}</p>
                        </div>
                      ))}
                    </div>
                    {securityDeposit && Number(securityDeposit) > 0 && (
                      <p className="mt-3 text-xs text-[var(--sea-ink-soft)]">
                        + ₹{Number(securityDeposit).toLocaleString('en-IN')} refundable deposit collected at booking
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Photos ──────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <SectionHeader
                  icon="📸"
                  title="Add Photos"
                  subtitle="Listings with 3+ photos get 4× more bookings. First photo is the cover."
                />

                {/* Drop zone */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 10}
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--lagoon)] bg-[rgba(79,184,178,0.06)] px-6 py-10 text-center transition hover:bg-[rgba(79,184,178,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-4xl">📷</span>
                  <div>
                    <p className="font-semibold text-[var(--lagoon-deep)]">
                      {images.length === 0 ? 'Upload photos' : 'Add more photos'}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
                      JPG, PNG, WEBP · Max 10MB each · Up to {10 - images.length} more
                    </p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />

                {/* Image grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {images.map((img, i) => (
                      <div key={img.preview} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--line)]">
                        <img
                          src={img.preview}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />

                        {/* Cover badge */}
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--lagoon-deep)] px-2 py-0.5 text-[10px] font-bold text-white">
                            Cover
                          </span>
                        )}

                        {/* Uploading overlay */}
                        {img.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="text-2xl animate-spin">⏳</span>
                          </div>
                        )}

                        {/* Error overlay */}
                        {img.error && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/70 p-2 text-center">
                            <span className="text-xl">⚠️</span>
                            <p className="text-[10px] text-white">{img.error}</p>
                          </div>
                        )}

                        {/* Actions (visible on hover) */}
                        {!img.uploading && !img.error && (
                          <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(i, i - 1)}
                                title="Move left"
                                className="rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-gray-800 hover:bg-white"
                              >
                                ←
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              title="Remove"
                              className="ml-auto rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-red-600"
                            >
                              ✕
                            </button>
                            {i < images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(i, i + 1)}
                                title="Move right"
                                className="rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-gray-800 hover:bg-white"
                              >
                                →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {images.length === 0 && (
                  <p className="text-center text-sm text-[var(--sea-ink-soft)]">
                    At least 1 photo is required to publish.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 3: Location ────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <SectionHeader
                  icon="📍"
                  title="Item Location"
                  subtitle="Used for hyper-local search. Your exact address is never shown publicly."
                />

                <Field label="Street Address" required>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 MG Road"
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" required>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bengaluru"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="State">
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Karnataka"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" required>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Postal Code">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="560001"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Coordinates */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-[var(--sea-ink)]">
                      Coordinates <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={geoLoading}
                      className="flex items-center gap-1.5 rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-1 text-xs font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.2)] disabled:opacity-60"
                    >
                      {geoLoading ? (
                        <>
                          <span className="animate-spin">⏳</span> Detecting…
                        </>
                      ) : (
                        <>📡 Use my location</>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      required
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Latitude (e.g. 12.9716)"
                      className={inputCls}
                    />
                    <input
                      type="number"
                      required
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Longitude (e.g. 77.5946)"
                      className={inputCls}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--sea-ink-soft)]">
                    💡 Or look up coordinates at{' '}
                    <a
                      href="https://www.latlong.net"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      latlong.net
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-2.5 text-sm font-semibold text-[var(--sea-ink-soft)] transition hover:-translate-y-0.5 disabled:invisible"
            >
              ← Back
            </button>

            <p className="text-xs text-[var(--sea-ink-soft)]">
              Step {step + 1} of {STEPS.length}
            </p>

            {isLastStep ? (
              <button
                type="submit"
                disabled={submitting || !canAdvance()}
                className="rounded-full bg-[var(--lagoon-deep)] px-8 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Publishing…' : '🚀 Publish listing'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="rounded-full bg-[var(--lagoon-deep)] px-8 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next →
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.25)]'

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-2">
      <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--sea-ink)]">
        <span>{icon}</span>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{subtitle}</p>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{hint}</p>
      )}
    </div>
  )
}
