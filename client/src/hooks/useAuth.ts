import { useSyncExternalStore } from 'react'
import { authStore } from '../lib/auth-store'

export function useAuth() {
  const { user, token } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    () => ({ user: null, token: null }),
  )

  return {
    user,
    token,
    isAuthenticated: !!token,
    setAuth: authStore.setAuth,
    clearAuth: authStore.clearAuth,
  }
}
