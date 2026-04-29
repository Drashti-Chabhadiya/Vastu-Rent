export function AboutPage() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">About</p>
        <h1 className="display-title mb-3 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--text-dark)' }}>
          VastuRent — Curated Rentals
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8" style={{ color: 'var(--text-soft)' }}>
          VastuRent is a hyper-local peer-to-peer rental marketplace for furniture, decor,
          tableware and event essentials. Rent beautifully maintained pieces affordably and
          sustainably — or list your own items to earn while they sit idle.
        </p>
      </section>
    </main>
  )
}
