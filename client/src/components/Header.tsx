import { Link, useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { isAuthenticated, user, clearAuth } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    clearAuth()
    navigate({ to: '/', search: { accessDenied: undefined } })
  }

  console.log('user', user)

  return (
    <header className={clsx('sticky', 'top-0', 'z-50', 'border-b', 'border-[var(--line)]', 'bg-[var(--header-bg)]', 'px-4', 'backdrop-blur-lg')}>
      <nav className={clsx('page-wrap', 'flex', 'flex-wrap', 'items-center', 'gap-x-3', 'gap-y-2', 'py-3', 'sm:py-4')}>
        {/* Logo */}
        <h2 className={clsx('m-0', 'flex-shrink-0', 'text-base', 'font-semibold', 'tracking-tight')}>
          <Link
            to="/"
            search={{ accessDenied: undefined }}
            className={clsx('inline-flex', 'items-center', 'gap-2', 'rounded-full', 'border', 'border-[var(--chip-line)]', 'bg-[var(--chip-bg)]', 'px-3', 'py-1.5', 'text-sm', 'text-[var(--sea-ink)]', 'no-underline', 'shadow-[0_8px_24px_rgba(30,90,72,0.08)]', 'sm:px-4', 'sm:py-2')}
          >
            <span className={clsx('h-2', 'w-2', 'rounded-full', 'bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]')} />
            Vastu-Rent
          </Link>
        </h2>

        {/* Right-side actions */}
        <div className={clsx('ml-auto', 'flex', 'items-center', 'gap-1.5', 'sm:ml-0', 'sm:gap-2')}>
          {isAuthenticated ? (
            <>
              <Link
                to="/listings/new"
                className={clsx('hidden', 'rounded-full', 'border', 'border-[rgba(50,143,151,0.3)]', 'bg-[rgba(79,184,178,0.14)]', 'px-4', 'py-1.5', 'text-sm', 'font-semibold', 'text-[var(--lagoon-deep)]', 'no-underline', 'transition', 'hover:-translate-y-0.5', 'hover:bg-[rgba(79,184,178,0.24)]', 'sm:inline-flex')}
              >
                + List an Item
              </Link>
              <button
                onClick={handleSignOut}
                className={clsx('rounded-full', 'border', 'border-[var(--line)]', 'bg-[var(--surface-strong)]', 'px-3', 'py-1.5', 'text-sm', 'font-semibold', 'text-[var(--sea-ink-soft)]', 'transition', 'hover:-translate-y-0.5')}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className={clsx('rounded-full', 'border', 'border-[var(--line)]', 'bg-[var(--surface-strong)]', 'px-3', 'py-1.5', 'text-sm', 'font-semibold', 'text-[var(--sea-ink-soft)]', 'no-underline', 'transition', 'hover:-translate-y-0.5')}
              >
                Sign in
              </Link>
              <Link
                to="/auth/register"
                className={clsx('rounded-full', 'bg-[var(--lagoon-deep)]', 'px-3', 'py-1.5', 'text-sm', 'font-semibold', 'text-white', 'no-underline', 'transition', 'hover:-translate-y-0.5', 'hover:bg-[var(--lagoon)]')}
              >
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Nav links */}
        <div className={clsx('order-3', 'flex', 'w-full', 'flex-wrap', 'items-center', 'gap-x-4', 'gap-y-1', 'pb-1', 'text-sm', 'font-semibold', 'sm:order-2', 'sm:w-auto', 'sm:flex-nowrap', 'sm:pb-0')}>
          <Link
            to="/"
            search={{ accessDenied: undefined }}
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/listings"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Browse
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Dashboard
              </Link>
              <Link
                to="/messages"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Messages
              </Link>
            </>
          )}
          {isAuthenticated && user?.name && (
            <span className={clsx('ml-1', 'hidden', 'text-xs', 'text-[var(--sea-ink-soft)]', 'sm:inline')}>
              Hi, {user.name.split(' ')[0]}
              {user.role === 'SUPER_ADMIN' && (
                <span className="ml-1.5 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  SUPER ADMIN
                </span>
              )}
              {user.role === 'ADMIN' && (
                <span className="ml-1.5 rounded-full bg-[var(--lagoon-deep)] px-2 py-0.5 text-[10px] font-bold text-white">
                  ADMIN
                </span>
              )}
            </span>
          )}
        </div>
      </nav>
    </header>
  )
}
