/**
 * useRoleGuard — redirects users who don't meet the minimum role requirement.
 *
 * Usage:
 *   const { allowed } = useRoleGuard('ADMIN')
 *   if (!allowed) return null  // redirect is already in flight
 *
 * Role hierarchy: USER < ADMIN < SUPER_ADMIN
 */
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from './useAuth'

const ROLE_RANK: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

interface RoleGuardResult {
  /** true when the current user meets the required role */
  allowed: boolean
  /** true while auth state is still loading */
  loading: boolean
}

export function useRoleGuard(minRole: string): RoleGuardResult {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    // Give the auth store one tick to hydrate from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        navigate({ to: '/auth/login', search: { redirect: window.location.pathname } as never })
        setAllowed(false)
        setLoading(false)
        return
      }

      const userRank = ROLE_RANK[user?.role ?? 'USER'] ?? 0
      const requiredRank = ROLE_RANK[minRole] ?? 99

      if (userRank < requiredRank) {
        // Redirect to home with an access-denied flag in the URL
        navigate({ to: '/', search: { accessDenied: '1' } })
        setAllowed(false)
      } else {
        setAllowed(true)
      }
      setLoading(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [isAuthenticated, user?.role, minRole, navigate])

  return { allowed, loading }
}
