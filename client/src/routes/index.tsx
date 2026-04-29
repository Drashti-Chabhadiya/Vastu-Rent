import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, BadgeCheck, Truck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { categories, listings } from '@/lib/api'
import type { Listing } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from "../lib/utils";

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    accessDenied: search.accessDenied === '1' ? ('1' as const) : undefined,
  }),
  loader: async () => {
    const [cats, featured] = await Promise.all([
      categories.list(),
      listings.search({ limit: 6 }),
    ])
    return { cats, featured: featured.data }
  },
  component: HomePage,
})

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Honest Pricing',
    desc: 'Clear daily rate plus a refundable deposit. No surprises.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Owners',
    desc: 'Every Admin is reviewed by our team before going live.',
  },
  {
    icon: Truck,
    title: 'Doorstep Delivery',
    desc: 'Owners coordinate pickup and drop across major Indian cities.',
  },
  {
    icon: Star,
    title: 'Curated Quality',
    desc: 'Only beautifully maintained pieces make it onto VastuRent.',
  },
]

function HomePage() {
  const { cats, featured } = Route.useLoaderData()
  const { user } = useAuth()

  return (
    <main>
      {/* ── Hero ── */}
      <section className={cn('relative', 'overflow-hidden')} style={{ minHeight: '480px' }}>
        <div
          className={cn('absolute', 'inset-0', 'bg-cover', 'bg-center')}
          style={{ backgroundImage: "url('/assets/hero-vasturent.jpg')" }}
        />
        <div
          className={cn('absolute', 'inset-0')}
          style={{ background: 'linear-gradient(to right, rgba(253,246,236,0.94) 0%, rgba(253,246,236,0.78) 52%, rgba(253,246,236,0.25) 100%)' }}
        />
        <div className={cn('page-wrap', 'relative', 'px-4', 'py-20', 'sm:py-28')}>
          <Badge variant="secondary" className={cn('mb-4', 'gap-1.5', 'rounded-full', 'px-3', 'py-1.5', 'text-xs')} style={{ background: 'rgba(139,69,19,0.1)', color: 'var(--brand)', border: '1px solid rgba(139,69,19,0.2)' }}>
            <span>✦</span> Curated rentals for every occasion
          </Badge>

          <h1
            className={cn('display-title', 'mb-4', 'max-w-lg', 'text-4xl', 'font-bold', 'leading-tight', 'sm:text-5xl')}
            style={{ color: 'var(--text-dark)' }}
          >
            Create Your Dream Space,{' '}
            <span style={{ color: 'var(--brand)' }}>One Rental at a Time</span>
          </h1>

          <p className={cn('mb-8', 'max-w-md', 'text-base', 'leading-relaxed')} style={{ color: 'var(--text-mid)' }}>
            Discover handpicked furniture, decor and essentials to furnish your home or celebrate your special event — affordably and sustainably.
          </p>

          <div className={cn('flex', 'flex-wrap', 'gap-3')}>
            <Button size="lg" asChild>
              <Link to="/listings">Explore Rentals</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/listings/new">List Your Items</Link>
            </Button>
          </div>

          {user && (
            <p className={cn('mt-5', 'text-sm')} style={{ color: 'var(--text-soft)' }}>
              Welcome back, <strong style={{ color: 'var(--text-dark)' }}>{user.name.split(' ')[0]}</strong>
            </p>
          )}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className={cn('page-wrap', 'px-4', 'py-12')}>
        <div className={cn('grid', 'gap-4', 'sm:grid-cols-2', 'lg:grid-cols-4')}>
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title} className={cn('feature-card', 'border-0', 'p-6')}>
                <CardContent className="p-0">
                  <div
                    className={cn('mb-3', 'flex', 'h-12', 'w-12', 'items-center', 'justify-center', 'rounded-xl')}
                    style={{ background: 'rgba(139,69,19,0.1)', color: 'var(--brand)' }}
                  >
                    <Icon className={cn('h-6', 'w-6')} />
                  </div>
                  <h3 className={cn('mb-1.5', 'text-base', 'font-semibold')} style={{ color: 'var(--brand)' }}>{f.title}</h3>
                  <p className={cn('m-0', 'text-sm', 'leading-relaxed')} style={{ color: 'var(--text-soft)' }}>{f.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── Featured Rentals ── */}
      {featured.length > 0 && (
        <section className={cn('page-wrap', 'px-4', 'pb-14')}>
          <div className={cn('mb-6', 'flex', 'items-end', 'justify-between')}>
            <div>
              <h2 className={cn('display-title', 'text-2xl', 'font-bold')} style={{ color: 'var(--text-dark)' }}>
                Featured Rentals
              </h2>
              <p className={cn('mt-1', 'text-sm')} style={{ color: 'var(--text-soft)' }}>
                Handpicked pieces our community is loving this week.
              </p>
            </div>
            <Button variant="link" size="sm" className={cn('gap-1', 'p-0')} asChild>
              <Link to="/listings">Browse all <ArrowRight className={cn('h-3.5', 'w-3.5')} /></Link>
            </Button>
          </div>

          <div className={cn('grid', 'gap-5', 'sm:grid-cols-2', 'lg:grid-cols-3')}>
            {featured.map((item, i) => (
              <ListingCard key={item.id} listing={item} delay={i * 60} />
            ))}
          </div>
        </section>
      )}

      {/* ── Categories ── */}
      {cats.length > 0 && (
        <section className={cn('page-wrap', 'px-4', 'pb-14')}>
          <h2 className={cn('display-title', 'mb-6', 'text-2xl', 'font-bold')} style={{ color: 'var(--text-dark)' }}>
            Shop by Category
          </h2>
          <div className={cn('grid', 'grid-cols-2', 'gap-3', 'sm:grid-cols-4', 'lg:grid-cols-8')}>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                to="/listings"
                search={{ categoryId: cat.id }}
                className="no-underline"
              >
                <Card className={cn('feature-card', 'flex', 'flex-col', 'items-center', 'gap-2', 'p-4', 'text-center', 'transition-all', 'hover:-translate-y-1', 'cursor-pointer')}>
                  <span className="text-2xl">{cat.icon ?? '📦'}</span>
                  <span className={cn('text-xs', 'font-semibold')} style={{ color: 'var(--text-dark)' }}>{cat.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Owner CTA ── */}
      <section className={cn('page-wrap', 'px-4', 'pb-16')}>
        <div className={cn('rounded-2xl', 'px-8', 'py-10')} style={{ background: 'var(--brand)' }}>
          <h2 className={cn('display-title', 'mb-2', 'text-2xl', 'font-bold', 'text-white')}>
            Have items lying unused?
          </h2>
          <p className={cn('mb-6', 'max-w-lg', 'text-sm', 'leading-relaxed')} style={{ color: 'rgba(255,255,255,0.85)' }}>
            Turn them into income. Apply to become a VastuRent Admin and start listing today — free verification, fair commissions.
          </p>
          <Button variant="amber" asChild>
            <Link to="/auth/register">Become an Owner</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

function ListingCard({ listing, delay = 0 }: { listing: Listing; delay?: number }) {
  const isRentedOut = listing.status === 'RENTED' || listing.status === 'UNAVAILABLE'

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className={cn('rise-in', 'group', 'block', 'no-underline')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card className={cn('feature-card', 'overflow-hidden', 'border-0')}>
        <div className={cn('relative', 'overflow-hidden')} style={{ aspectRatio: '4/3', background: 'var(--sand)' }}>
          {listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className={cn('h-full', 'w-full', 'object-cover', 'transition', 'duration-300', 'group-hover:scale-105')}
            />
          ) : (
            <div className={cn('flex', 'h-full', 'items-center', 'justify-center', 'text-4xl')} style={{ background: 'var(--sand)' }}>
              🛋️
            </div>
          )}
          <span className={cn('cat-pill', 'absolute', 'left-2.5', 'top-2.5')}>{listing.category.name}</span>
          {isRentedOut && (
            <Badge variant="destructive" className={cn('absolute', 'left-1/2', 'top-1/2', '-translate-x-1/2', '-translate-y-1/2', 'uppercase', 'tracking-wide', 'text-[10px]')}>
              Rented Out
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className={cn('mb-1', 'line-clamp-1', 'text-sm', 'font-semibold')} style={{ color: 'var(--text-dark)' }}>
            {listing.title}
          </h3>
          <p className={cn('mb-3', 'text-xs')} style={{ color: 'var(--text-soft)' }}>
            by {listing.owner.name}
          </p>
          <div className={cn('flex', 'items-end', 'justify-between')}>
            <div>
              <p className={cn('text-sm', 'font-bold')} style={{ color: 'var(--text-dark)' }}>
                ₹{Number(listing.pricePerDay).toFixed(0)}
                <span className={cn('font-normal', 'text-xs')} style={{ color: 'var(--text-soft)' }}>/day</span>
              </p>
              {listing.securityDeposit && Number(listing.securityDeposit) > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                  Deposit ₹{Number(listing.securityDeposit).toLocaleString('en-IN')}
                </p>
              )}
            </div>
            <span className={cn('flex', 'items-center', 'gap-0.5', 'text-xs', 'font-semibold')} style={{ color: 'var(--brand)' }}>
              View <ArrowRight className={cn('h-3', 'w-3')} />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
