import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import SuperAdminPanel from '../components/SuperAdminPanel'

export const Route = createFileRoute('/admin')({
  component: AdminRoutePage,
})

function AdminRoutePage() {
  const { user, isAuthenticated, initializing } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait for boot-time silent refresh before checking roles
    if (initializing) return

    if (!isAuthenticated) {
      navigate({ to: '/auth/login' })
      return
    }
    if (user?.role === 'ADMIN') {
      navigate({ to: '/dashboard' })
      return
    }
    if (user?.role !== 'SUPER_ADMIN') {
      navigate({ to: '/', search: { accessDenied: '1' } })
    }
  }, [initializing, isAuthenticated, user?.role, navigate])

  // Show spinner while session is being restored
  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') return null

  return (
    <main className="page-wrap px-4 pb-20 pt-8">
      <SuperAdminPanel />
    </main>
  )
}
