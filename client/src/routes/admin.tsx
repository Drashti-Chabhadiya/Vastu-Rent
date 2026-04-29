/**
 * /admin — dedicated Super Admin route.
 * Redirects non-SUPER_ADMIN users to home with an access-denied message.
 * ADMIN users are redirected to /dashboard (their admin panel is there).
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import SuperAdminPanel from '../components/SuperAdminPanel'

export const Route = createFileRoute('/admin')({
  component: AdminRoutePage,
})

function AdminRoutePage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' })
      return
    }
    if (user?.role === 'ADMIN') {
      // Regular admins use the dashboard
      navigate({ to: '/dashboard' })
      return
    }
    if (user?.role !== 'SUPER_ADMIN') {
      // USER role — access denied
      navigate({ to: '/', search: { accessDenied: '1' } })
    }
  }, [isAuthenticated, user?.role, navigate])

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') return null

  return (
    <main className="page-wrap px-4 pb-20 pt-8">
      <SuperAdminPanel />
    </main>
  )
}
