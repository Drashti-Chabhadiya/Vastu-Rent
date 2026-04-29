import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { auth } from '../lib/api'
import { authStore } from '../lib/auth-store'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/auth/complete-profile')({
  component: CompleteProfilePage,
})

// Common Indian neighborhoods / areas for the placeholder hint
const PLACEHOLDER_HINT = 'e.g. Koramangala, Bandra West, Sector 18 Noida…'

function CompleteProfilePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [phone, setPhone] = useState(user?.phone ?? '')
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect effects run after render, avoiding the "navigate during render" issue
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/register' })
    } else if (user?.phone && user?.neighborhood) {
      navigate({ to: '/dashboard' })
    }
  }, [isAuthenticated, user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const updatedUser = await auth.completeProfile({ phone, neighborhood })
      // Merge updated fields into the stored auth state
      authStore.setAuth(authStore.getSnapshot().token!, {
        ...authStore.getSnapshot().user!,
        ...updatedUser,
      })
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while redirect effects are pending
  if (!isAuthenticated || (user?.phone && user?.neighborhood)) {
    return null
  }

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        {/* Header */}
        <div className="mb-6">
          <p className="island-kicker mb-2">One last step</p>
          <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)]">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
            Vastu-Rent is hyper-local. Your WhatsApp number and neighbourhood
            help renters and lenders connect quickly and safely.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lagoon-deep)] text-xs font-bold text-white">
            ✓
          </div>
          <div className="h-0.5 flex-1 bg-[var(--lagoon-deep)]" />
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lagoon-deep)] text-xs font-bold text-white">
            2
          </div>
          <div className="h-0.5 flex-1 bg-[var(--line)]" />
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-xs font-semibold text-[var(--sea-ink-soft)]">
            3
          </div>
        </div>
        <div className="mb-6 flex justify-between text-xs text-[var(--sea-ink-soft)]">
          <span>Account</span>
          <span className="font-semibold text-[var(--lagoon-deep)]">Profile</span>
          <span>Explore</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* WhatsApp number */}
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]"
            >
              WhatsApp Number{' '}
              <span className="font-normal text-[var(--sea-ink-soft)]">
                (with country code)
              </span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg">
                📱
              </span>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-11 pr-4 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.25)]"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
              Used only to connect you with renters/lenders. Never shown publicly.
            </p>
          </div>

          {/* Neighbourhood */}
          <div>
            <label
              htmlFor="neighborhood"
              className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]"
            >
              Your Neighbourhood / Area
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg">
                📍
              </span>
              <input
                id="neighborhood"
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder={PLACEHOLDER_HINT}
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] py-2.5 pl-11 pr-4 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[rgba(79,184,178,0.25)]"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
              This powers hyper-local search so you see items near you first.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--lagoon-deep)] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save & Continue →'}
          </button>
        </form>

        {/* Trust note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--sand)] p-4">
          <span className="mt-0.5 text-xl">🔒</span>
          <p className="text-xs leading-relaxed text-[var(--sea-ink-soft)]">
            Your phone number is encrypted and only shared with the other party
            after a booking is confirmed. Your neighbourhood is used only for
            proximity search.
          </p>
        </div>
      </div>
    </main>
  )
}
