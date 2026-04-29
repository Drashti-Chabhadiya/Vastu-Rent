import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/api'
import { authStore } from '@/lib/auth-store'
import { useAuth } from '@/hooks/useAuth'

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [phone,        setPhone]        = useState(user?.phone        ?? '')
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

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
      const snap = authStore.getSnapshot()
      if (snap.accessToken && snap.user) {
        authStore.setAuth(snap.accessToken, { ...snap.user, ...updatedUser })
      }
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || (user?.phone && user?.neighborhood)) return null

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <div className="mb-6">
          <p className="island-kicker mb-2">One last step</p>
          <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--text-dark)' }}>
            Complete your profile
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-soft)' }}>
            Your WhatsApp number and neighbourhood help renters and lenders connect quickly and safely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>
              WhatsApp Number{' '}
              <span className="font-normal" style={{ color: 'var(--text-soft)' }}>(with country code)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg">📱</span>
              <input
                id="phone" type="tel" required autoComplete="tel"
                placeholder="+919876543210" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 pl-11 text-sm outline-none"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-strong)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="neighborhood" className="mb-1 block text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>
              Your Neighbourhood / Area
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg">📍</span>
              <input
                id="neighborhood" type="text" required minLength={2} maxLength={120}
                placeholder="e.g. Koramangala, Bandra West…" value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 pl-11 text-sm outline-none"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-strong)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--brand)' }}
          >
            {loading ? 'Saving…' : 'Save & Continue →'}
          </button>
        </form>
      </div>
    </main>
  )
}
