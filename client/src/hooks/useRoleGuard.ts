/**
 * useRoleGuard — redirects users who don't meet the minimum role requirement.
 *
 * Waits for the boot-time silent refresh to finish before checking auth,
 * so it never incorrectly redirects a user whose session is still being restored.
 */
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from './useAuth'

const ROLE_RANK: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

export function useRoleGuard(minRole: string) {
  const { user, isAuthenticated, initializing } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (initializing) return // wait for silent refresh

    if (!isAuthenticated) {
      navigate({ to: '/auth/login' })
      return
    }

    const userRank     = ROLE_RANK[user?.role ?? 'USER'] ?? 0
    const requiredRank = ROLE_RANK[minRole] ?? 99

    if (userRank < requiredRank) {
      navigate({ to: '/', search: { accessDenied: '1' } })
    }
  }, [initializing, isAuthenticated, user?.role, minRole, navigate])

  return {
    allowed: !initializing && isAuthenticated &&
      (ROLE_RANK[user?.role ?? 'USER'] ?? 0) >= (ROLE_RANK[minRole] ?? 99),
    loading: initializing,
  }
}
