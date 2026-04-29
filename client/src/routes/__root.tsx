import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { auth } from '../lib/api'
import { authStore } from '../lib/auth-store'
import { useSocket } from '../hooks/useSocket'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Vastu-Rent – Hyper-local P2P Rental Marketplace',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const socket = useSocket()

  // ── Refresh user on load ──────────────────────────────────────────────────
  // Re-fetch from server so role changes (e.g. ADMIN promotion) take effect
  // without requiring a fresh login.
  useEffect(() => {
    const { token } = authStore.getSnapshot()
    if (!token) return
    auth.me().then((freshUser) => {
      authStore.setAuth(token, freshUser)
    }).catch(() => {
      authStore.clearAuth()
    })
  }, [])

  // ── Global notification toast ─────────────────────────────────────────────
  // Listens for booking/message notifications pushed via Socket.io and shows
  // a dismissible toast anywhere on the site.
  const [toasts, setToasts] = useState<
    { id: number; title: string; body: string; type: string }[]
  >([])

  useEffect(() => {
    if (!socket) return

    function onNotification(n: { type: string; title: string; body: string }) {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, ...n }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 7000)
    }

    socket.on('notification:new', onNotification)
    return () => { socket.off('notification:new', onNotification) }
  }, [socket])

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Icon per notification type
  function toastIcon(type: string) {
    if (type === 'booking_request') return '📦'
    if (type === 'booking_confirmed') return '✅'
    if (type === 'booking_cancelled') return '❌'
    if (type === 'booking_completed') return '🎉'
    if (type === 'message') return '💬'
    return '🔔'
  }

  return (
    <>
      <Header />
      <Outlet />
      <Footer />

      {/* ── Notification toasts ──────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-[var(--lagoon)] bg-[var(--surface-strong)] p-4 shadow-[0_8px_32px_rgba(30,90,72,0.18)] backdrop-blur-md"
            style={{ animation: 'rise-in 300ms cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <span className="mt-0.5 text-xl">{toastIcon(t.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--sea-ink)]">{t.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--sea-ink-soft)]">{t.body}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="flex-shrink-0 text-sm text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
      />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
