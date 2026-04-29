import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer mt-20 px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap grid gap-8 sm:grid-cols-3">
        <div>
          <p className="island-kicker mb-3">Vastu-Rent</p>
          <p className="m-0 text-sm leading-relaxed">
            Rent anything from your neighbours. Hyper-local, peer-to-peer, and
            community-first.
          </p>
        </div>

        <div>
          <p className="island-kicker mb-3">Explore</p>
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            <li>
              <Link to="/listings" className="nav-link">
                Browse Listings
              </Link>
            </li>
            <li>
              <Link to="/listings/new" className="nav-link">
                List an Item
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="nav-link">
                My Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="island-kicker mb-3">Company</p>
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            <li>
              <Link to="/about" className="nav-link">
                About
              </Link>
            </li>
            <li>
              <a href="#" className="nav-link">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="nav-link">
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="page-wrap mt-10 border-t border-[var(--line)] pt-6 text-center text-xs">
        &copy; {year} Vastu-Rent. All rights reserved.
      </div>
    </footer>
  )
}
