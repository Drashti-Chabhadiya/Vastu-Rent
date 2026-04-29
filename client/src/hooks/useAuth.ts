import { useAuthStore } from '@/lib/auth-store'

export function useAuth() {
  const user         = useAuthStore((s) => s.user)
  const accessToken  = useAuthStore((s) => s.accessToken)
  const initializing = useAuthStore((s) => s.initializing)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const clearAuth    = useAuthStore((s) => s.clearAuth)

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    initializing,
    setAuth,
    clearAuth,
    role: user?.role ?? null,
    isUser:       user?.role === 'USER',
    isAdmin:      user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  }
}
