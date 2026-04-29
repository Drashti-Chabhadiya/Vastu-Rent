import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { auth } from '../lib/api'
import { useAuthStore } from '../lib/auth-store'
import { useSocket } from '../hooks/useSocket'

import appCss from '../styles.css?url'

// Inline script: apply saved theme before first paint (no flash)
const THEME_SCRIPT = `(function(){try{
  var t=localStorage.getItem('theme');
  var m=(t==='light'||t==='dark'||t==='auto')?t:'auto';
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  var r=m==='auto'?(d?'dark':'light'):m;
  document.documentElement.classList.add(r);
  if(m!=='auto')document.documentElement.setAttribute('data-theme',m);
  document.documentElement.style.colorScheme=r;
}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'VastuRent - Curated Rentals for Every Occasion' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const socket        = useSocket()
  const silentRefresh = useAuthStore((s) => s.silentRefresh)
  const setUser       = useAuthStore((s) => s.setUser)
  const clearAuth     = useAuthStore((s) => s.clearAuth)

  // Boot: restore session from HttpOnly refresh cookie.
  // silentRefresh() is a singleton — if the route loader already triggered it,
  // this just awaits the same promise. No double HTTP request, no token rotation issue.
  useEffect(() => {
    silentRefresh().then((token) => {
      if (token) {
        // Fetch fresh user profile so role changes take effect without re-login
        auth.me()
          .then((u) => setUser(u))
          .catch(() => clearAuth())
      }
      // If null, clearAuth() was already called inside silentRefresh()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [toasts, setToasts] = useState<
    { id: number; title: string; body: string; type: string }[]
  >([])

  useEffect(() => {
    if (!socket) return
    function onNotification(n: { type: string; title: string; body: string }) {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, ...n }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000)
    }
    socket.on('notification:new', onNotification)
    return () => { socket.off('notification:new', onNotification) }
  }, [socket])

  function toastIcon(type: string) {
    const icons: Record<string, string> = {
      booking_request: '📦', booking_confirmed: '✅',
      booking_cancelled: '❌', booking_completed: '🎉', message: '💬',
    }
    return icons[type] ?? '🔔'
  }

  return (
    <>
      <Header />
      <Outlet />
      <Footer />

      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl p-4 backdrop-blur-md"
            style={{
              border: '1px solid var(--line)',
              background: 'var(--surface-strong)',
              boxShadow: '0 8px 32px rgba(139,69,19,0.15)',
              animation: 'rise-in 300ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <span className="mt-0.5 text-xl">{toastIcon(t.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{t.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-soft)' }}>{t.body}</p>
            </div>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="shrink-0 text-sm opacity-60 transition hover:opacity-100"
              style={{ color: 'var(--text-soft)' }}
              aria-label="Dismiss"
            >x</button>
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
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased" style={{ overflowWrap: 'anywhere' }}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
