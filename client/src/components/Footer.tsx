import { Link } from '@tanstack/react-router'
import { Separator } from '@/components/ui/separator'

const EXPLORE = ['Furniture', 'Decor', 'Tableware', 'Event Essentials']
const FOR_OWNERS = ['List your items', 'How payouts work', 'Damage protection']
const SUPPORT = ['Help center', 'Contact us', 'Terms & Privacy']

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer mt-20 px-4 pb-12 pt-12">
      <div className="page-wrap grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <p
            className="mb-3 text-xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--text-dark)' }}
          >
            <span style={{ color: 'var(--text-dark)' }}>Vastu</span>
            <span style={{ color: 'var(--brand)' }}>Rent</span>
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Curated rentals for modern Indian homes — affordable, sustainable, beautiful.
          </p>
        </div>

        {/* Explore */}
        <div>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>Explore</p>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {EXPLORE.map((label) => (
              <li key={label}>
                <Link to="/listings" className="text-sm no-underline transition hover:underline" style={{ color: 'var(--text-soft)' }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* For Owners */}
        <div>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>For Owners</p>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {FOR_OWNERS.map((label) => (
              <li key={label}>
                <Link to="/listings/new" className="text-sm no-underline transition hover:underline" style={{ color: 'var(--text-soft)' }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>Support</p>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {SUPPORT.map((label) => (
              <li key={label}>
                <a href="#" className="text-sm no-underline transition hover:underline" style={{ color: 'var(--text-soft)' }}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator className="my-8 page-wrap" style={{ background: 'var(--line)' }} />

      <p className="page-wrap text-center text-xs" style={{ color: 'var(--text-soft)' }}>
        &copy; {year} VastuRent. Made with care in India.
      </p>
    </footer>
  )
}
