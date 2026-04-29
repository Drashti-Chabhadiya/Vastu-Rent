import { Link, useNavigate } from '@tanstack/react-router'
import { Search, ShieldCheck, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import ThemeToggle from '@/components/ThemeToggle'
import { auth } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { isAuthenticated, user, clearAuth, isAdmin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : ''

  async function handleSignOut() {
    try { await auth.logout() } catch { /* ignore */ }
    clearAuth()
    navigate({ to: '/', search: { accessDenied: undefined } })
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: 'var(--header-bg)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}
    >
      <div className="page-wrap flex items-center gap-4 px-4 py-3">
        <Link to="/" search={{ accessDenied: undefined }} className="shrink-0 no-underline">
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            <span style={{ color: 'var(--text-dark)' }}>Vastu</span>
            <span style={{ color: 'var(--brand)' }}>Rent</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 sm:flex">
          <Link to="/" search={{ accessDenied: undefined }} className="nav-link" activeProps={{ className: 'nav-link is-active' }} activeOptions={{ exact: true }}>Home</Link>
          <Link to="/listings" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>Browse</Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>Dashboard</Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin" className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
              <Crown className="mr-1 inline h-3.5 w-3.5" />Control
            </Link>
          )}
        </nav>

        <form
          className="relative ml-auto hidden max-w-xs flex-1 md:flex"
          onSubmit={(e) => {
            e.preventDefault()
            const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
            navigate({ to: '/listings', search: q ? { q } : {} })
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-soft)' }} />
          <Input name="q" type="search" placeholder="Search furniture, decor..." className="h-9 pl-9 text-sm" />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              {isSuperAdmin && (
                <Badge className="hidden items-center gap-1 rounded-full sm:flex" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <Crown className="h-3 w-3" /> Super Admin
                </Badge>
              )}
              {isAdmin && !isSuperAdmin && (
                <Badge className="hidden items-center gap-1 rounded-full sm:flex" style={{ background: 'rgba(139,69,19,0.1)', color: 'var(--brand)', border: '1px solid rgba(139,69,19,0.2)' }}>
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-semibold sm:block" style={{ color: 'var(--text-dark)' }}>
                  {user?.name?.split(' ')[0]}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs">Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/auth/login">Sign in</Link></Button>
              <Button size="sm" asChild><Link to="/auth/register">Sign up</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
