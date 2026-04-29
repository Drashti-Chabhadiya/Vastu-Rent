/**
 * Auth store — Zustand, 100% in-memory.
 *
 * Security model:
 *   - accessToken → memory only. Lost on page refresh → silentRefresh() restores it.
 *   - Refresh token → HttpOnly cookie. JS never touches it.
 *   - User profile  → memory only. Restored via /auth/me after silentRefresh().
 *
 * Key design: silentRefresh() is a singleton promise — no matter how many
 * callers invoke it concurrently (loader + useEffect + api.ts), the actual
 * HTTP request to /auth/refresh is made exactly ONCE. All callers await the
 * same promise and get the same result. This prevents token rotation from
 * consuming the cookie twice and leaving the user logged out.
 */
import { create } from 'zustand'
import type { AuthUser } from './api'

export interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  /** true while the boot-time silent refresh is in flight */
  initializing: boolean
}

interface AuthActions {
  setAuth:        (accessToken: string, user: AuthUser) => void
  setAccessToken: (accessToken: string) => void
  setUser:        (user: AuthUser) => void
  clearAuth:      () => void
  setReady:       () => void
  silentRefresh:  () => Promise<string | null>
}

const BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:4000/api'

// ── Singleton refresh promise ─────────────────────────────────────────────────
// Shared across ALL callers (loader, useEffect, api.ts on-401 handler).
// The cookie is consumed exactly once per page load.
let _refreshPromise: Promise<string | null> | null = null

function doSilentRefresh(
  onSuccess: (token: string) => void,
  onFail: () => void,
): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        onFail()
        return null
      }

      const data = (await res.json()) as { accessToken: string }
      onSuccess(data.accessToken)
      return data.accessToken
    } catch {
      onFail()
      return null
    } finally {
      // Clear the singleton so future explicit refreshes (e.g. after token
      // expiry mid-session) can run a new request.
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

// ── Zustand store ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user:         null,
  accessToken:  null,
  initializing: true,

  setAuth(accessToken, user) {
    // After a fresh login the boot refresh is no longer needed
    _refreshPromise = null
    set({ accessToken, user, initializing: false })
  },

  setAccessToken(accessToken) {
    set({ accessToken, initializing: false })
  },

  setUser(user) {
    set({ user })
  },

  clearAuth() {
    set({ accessToken: null, user: null, initializing: false })
  },

  setReady() {
    if (get().initializing) set({ initializing: false })
  },

  /**
   * Restore the session from the HttpOnly refresh cookie.
   * Safe to call from multiple places simultaneously — only one HTTP request
   * is ever made. Returns the new access token or null.
   */
  silentRefresh(): Promise<string | null> {
    // If we already have a valid token, no need to refresh
    const { accessToken } = get()
    if (accessToken) {
      // Still mark initializing done in case this is the boot call
      if (get().initializing) set({ initializing: false })
      return Promise.resolve(accessToken)
    }

    return doSilentRefresh(
      (token) => get().setAccessToken(token),
      ()      => get().clearAuth(),
    )
  },
}))

// ── Backward-compatible shim for api.ts ───────────────────────────────────────
export const authStore = {
  getSnapshot:    () => useAuthStore.getState(),
  subscribe:      (fn: () => void) => useAuthStore.subscribe(fn),
  setAuth:        (token: string, user: AuthUser) => useAuthStore.getState().setAuth(token, user),
  setAccessToken: (token: string) => useAuthStore.getState().setAccessToken(token),
  setUser:        (user: AuthUser) => useAuthStore.getState().setUser(user),
  clearAuth:      () => useAuthStore.getState().clearAuth(),
  setReady:       () => useAuthStore.getState().setReady(),
  silentRefresh:  () => useAuthStore.getState().silentRefresh(),
}
