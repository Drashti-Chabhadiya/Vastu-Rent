import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { auth } from '../lib/api'
import { authStore } from '../lib/auth-store'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await auth.login({ email, password })
      authStore.setAuth(res.token, res.user)
      // If the user hasn't completed their profile yet, send them there first
      if (!res.user.phone || !res.user.neighborhood) {
        navigate({ to: '/auth/complete-profile' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <p className="island-kicker mb-2">Welcome back</p>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)]">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none focus:border-[var(--lagoon)]"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--lagoon-deep)] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--lagoon)] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--sea-ink-soft)]">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="font-semibold text-[var(--lagoon-deep)]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
