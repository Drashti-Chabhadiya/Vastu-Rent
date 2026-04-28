/**
 * Minimal reactive auth store using a simple pub/sub pattern.
 * No external state library needed – works with React's useSyncExternalStore.
 */
import type { AuthUser } from './api'

interface AuthState {
  user: AuthUser | null
  token: string | null
}

function loadState(): AuthState {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null
    return { token, user }
  } catch {
    return { user: null, token: null }
  }
}

let state: AuthState = loadState()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export const authStore = {
  getSnapshot(): AuthState {
    return state
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  setAuth(token: string, user: AuthUser) {
    state = { token, user }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    notify()
  },

  clearAuth() {
    state = { token: null, user: null }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    notify()
  },
}
