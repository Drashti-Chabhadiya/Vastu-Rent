/**
 * Auth store — Zustand, 100% in-memory.
 *
 * Security model:
 *   - accessToken → memory only. Lost on page refresh → silentRefresh() restores it.
 *   - Refresh token → HttpOnly cookie. JS never touches it.
 *   - User profile  → memory only. Restored via /auth/me after silentRefresh().
 *
 * Key design:
 *   1. silentRefresh() is a singleton promise — concurrent callers (loader +
 *      useEffect + api.ts on-401) all await the same HTTP request. The cookie
 *      is consumed exactly once per page load.
 *   2. silentRefresh() is a no-op on the server (SSR). It only runs in the
 *      browser, called from useEffect in __root.tsx.
 *   3. BASE_URL is read lazily at call time so it picks up the Vite env var
 *      correctly in the browser instead of being evaluated during SSR.
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

// ── Singleton refresh promise ─────────────────────────────────────────────────
// One HTTP request per page load, shared by all callers.
let _refreshPromise: Promise<string | null> | null = null

// ── Zustand store ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user:         null,
  accessToken:  null,
  initializing: true,

  setAuth(accessToken, user) {
    _refreshPromise = null          // cancel any pending boot refresh
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
   *
   * - BROWSER only: returns null immediately on the server (SSR).
   * - Singleton: concurrent callers share one HTTP request.
   * - Short-circuits: if a token is already in memory, returns it immediately.
   */
  silentRefresh(): Promise<string | null> {
    // ── Server guard ──────────────────────────────────────────────────────────
    // During SSR there is no browser, no cookie, no fetch to localhost.
    // Mark initializing=false so the app doesn't hang, return null.
    if (typeof window === 'undefined') {
      set({ initializing: false })
      return Promise.resolve(null)
    }

    // ── Already have a token ──────────────────────────────────────────────────
    const { accessToken } = get()
    if (accessToken) {
      if (get().initializing) set({ initializing: false })
      return Promise.resolve(accessToken)
    }

    // ── Deduplicate concurrent calls ──────────────────────────────────────────
    if (_refreshPromise) return _refreshPromise

    // Read BASE_URL lazily here (browser context, Vite env vars available)
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

    _refreshPromise = (async (): Promise<string | null> => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method:      'POST',
          credentials: 'include',   // browser sends the HttpOnly cookie
          headers:     { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          // No valid session — not an error, just not logged in
          get().clearAuth()
          return null
        }

        const data = (await res.json()) as { accessToken: string }
        get().setAccessToken(data.accessToken)
        return data.accessToken
      } catch {
        // Network error — treat as no session
        get().clearAuth()
        return null
      } finally {
        // Allow future mid-session refreshes (e.g. after access token expiry)
        _refreshPromise = null
      }
    })()

    return _refreshPromise
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
