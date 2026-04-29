import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { listings, bookings, messages as messagesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'

export const Route = createFileRoute('/listings/$id')({
  loader: ({ params }) => listings.get(params.id),
  component: ListingDetailPage,
})

function ListingDetailPage() {
  const listing = Route.useLoaderData()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const socket = useSocket()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [startingChat, setStartingChat] = useState(false)
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null)

  const isOwner = user?.id === listing.owner.id
  const isAdminRole = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const canBook = isAuthenticated && !isOwner && !isAdminRole

  useEffect(() => {
    if (!socket) return
    function onNotification(n: { title: string; body: string }) {
      setToast(n)
      const t = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(t)
    }
    socket.on('notification:new', onNotification)
    return () => { socket.off('notification:new', onNotification) }
  }, [socket])

  const days = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000))
    : 0
  const totalPrice = days * Number(listing.pricePerDay)

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) { navigate({ to: '/auth/login' }); return }
    setBooking(true); setError(null)
    try {
      await bookings.create({ listingId: listing.id, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), notes })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally { setBooking(false) }
  }

  async function handleMessage() {
    if (!isAuthenticated) { navigate({ to: '/auth/login' }); return }
    setStartingChat(true)
    try {
      const conv = await messagesApi.startConversation({ recipientId: listing.owner.id, listingId: listing.id })
      navigate({ to: '/messages/$id', params: { id: conv.id } })
    } catch (err) { console.error(err) }
    finally { setStartingChat(false) }
  }

  const avgRating = listing.reviews?.length
    ? (listing.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / listing.reviews.length).toFixed(1)
    : null

  const waMessage = encodeURIComponent(`Hi, I am interested in renting your *${listing.title}* listed on VastuRent. Is it available?`)
  const waPhone = listing.owner.phone?.replace(/\D/g, '') ?? ''
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMessage}` : `https://wa.me/?text=${waMessage}`

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl p-4 backdrop-blur-md"
          style={{ border: '1px solid var(--line)', background: 'var(--surface-strong)', boxShadow: '0 8px 32px rgba(139,69,19,0.15)' }}>
          <span className="mt-0.5 text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{toast.title}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-soft)' }}>{toast.body}</p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100" style={{ color: 'var(--text-soft)' }}>✕</button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left */}
        <div>
          {/* Gallery */}
          <Card className="overflow-hidden border-0" style={{ border: '1px solid var(--line)' }}>
            <div className="aspect-video w-full overflow-hidden" style={{ background: 'var(--sand)' }}>
              {listing.images[activeImage] ? (
                <img src={listing.images[activeImage]} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">🛋️</div>
              )}
            </div>
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {listing.images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition"
                    style={{ borderColor: i === activeImage ? 'var(--brand)' : 'transparent' }}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Details */}
          <div className="mt-6">
            <p className="island-kicker mb-2">{listing.category.name}</p>
            <h1 className="display-title mb-2 text-3xl font-bold" style={{ color: 'var(--text-dark)' }}>{listing.title}</h1>
            <p className="mb-1 text-sm" style={{ color: 'var(--text-soft)' }}>
              📍 {listing.city}{listing.state ? `, ${listing.state}` : ''}, {listing.country}
            </p>
            {avgRating && (
              <p className="mb-4 text-sm" style={{ color: 'var(--text-soft)' }}>
                ⭐ {avgRating} ({listing._count?.reviews} reviews)
              </p>
            )}
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-mid)' }}>{listing.description}</p>
            {listing.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Owner */}
          <Card className="mt-6 border-0" style={{ border: '1px solid var(--line)', background: 'var(--surface-strong)' }}>
            <CardContent className="flex items-center gap-4 p-5">
              <Avatar className="h-12 w-12">
                <AvatarImage src={listing.owner.avatarUrl} alt={listing.owner.name} />
                <AvatarFallback style={{ background: 'var(--brand)' }}>{listing.owner.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
                  {listing.owner.name}
                  {listing.owner.governmentIdVerified && (
                    <Badge variant="secondary" className="text-[10px] rounded-full">🛡️ Verified</Badge>
                  )}
                </p>
                <div className="flex gap-1 text-[10px]" style={{ color: 'var(--text-soft)' }}>
                  Item owner ·{' '}
                  <span style={{ color: listing.owner.phoneVerified ? '#16a34a' : '#9ca3af' }}>📞 Phone</span> ·{' '}
                  <span style={{ color: listing.owner.emailVerified ? '#16a34a' : '#9ca3af' }}>✉️ Email</span>
                </div>
              </div>
              {!isOwner && isAuthenticated && (
                <Button variant="secondary" size="sm" onClick={handleMessage} disabled={startingChat} className="gap-1.5 rounded-full">
                  <MessageCircle className="h-4 w-4" />
                  {startingChat ? 'Opening…' : 'Message'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          {listing.reviews && listing.reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>Reviews</h2>
              <div className="space-y-4">
                {listing.reviews.map((review: { id: string; rating: number; comment?: string; createdAt: string; author: { id: string; name: string; avatarUrl?: string } }) => (
                  <Card key={review.id} className="border-0" style={{ border: '1px solid var(--line)', background: 'var(--surface-strong)' }}>
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ background: 'var(--brand)', fontSize: '0.75rem' }}>{review.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{review.author.name}</p>
                          <p className="text-xs">{'⭐'.repeat(review.rating)}</p>
                        </div>
                      </div>
                      {review.comment && <p className="m-0 text-sm" style={{ color: 'var(--text-mid)' }}>{review.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-0" style={{ border: '1px solid var(--line)', background: 'var(--surface-strong)', boxShadow: '0 8px 24px rgba(139,69,19,0.08)' }}>
            <CardContent className="p-6">
              <p className="mb-1 text-2xl font-bold" style={{ color: 'var(--brand)' }}>
                ₹{Number(listing.pricePerDay).toFixed(2)}
                <span className="text-base font-normal" style={{ color: 'var(--text-soft)' }}> / day</span>
              </p>
              <p className="mb-1 text-xs" style={{ color: 'var(--text-soft)' }}>{listing.minRentalDays}–{listing.maxRentalDays} day rental</p>
              {listing.securityDeposit && Number(listing.securityDeposit) > 0 && (
                <p className="mb-4 text-xs" style={{ color: 'var(--text-soft)' }}>
                  🔒 ₹{Number(listing.securityDeposit).toLocaleString('en-IN')} refundable deposit
                </p>
              )}

              <Separator className="mb-4" style={{ background: 'var(--line)' }} />

              {isOwner ? (
                <div className="rounded-xl p-4 text-center text-sm" style={{ background: 'var(--sand)', color: 'var(--text-soft)' }}>
                  This is your listing.{' '}
                  <Link to="/dashboard" className="font-semibold" style={{ color: 'var(--brand)' }}>Manage it →</Link>
                </div>
              ) : isAdminRole ? (
                <div className="rounded-xl p-4 text-center text-sm" style={{ background: 'var(--sand)', color: 'var(--text-soft)' }}>
                  <p className="mb-1 text-base">🏪</p>
                  <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>Admin accounts can't book items</p>
                </div>
              ) : success ? (
                <div className="space-y-3">
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(139,69,19,0.08)' }}>
                    <p className="text-2xl">🎉</p>
                    <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>Booking request sent!</p>
                    <p className="text-sm" style={{ color: 'var(--text-soft)' }}>The owner will confirm shortly.</p>
                  </div>
                  <Button className="w-full gap-2" style={{ background: '#25D366' }} asChild>
                    <a href={waUrl} target="_blank" rel="noreferrer">💬 Chat on WhatsApp</a>
                  </Button>
                  <Button variant="link" className="w-full" asChild>
                    <Link to="/dashboard">View my bookings →</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Start date</Label>
                    <Input id="start" type="date" required value={startDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">End date</Label>
                    <Input id="end" type="date" required value={endDate} min={startDate || new Date().toISOString().split('T')[0]} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any questions or special requests?" />
                  </div>
                  {days > 0 && (
                    <div className="rounded-xl p-3 text-sm space-y-1" style={{ background: 'var(--sand)' }}>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-soft)' }}>₹{Number(listing.pricePerDay).toFixed(2)} × {days} day{days !== 1 ? 's' : ''}</span>
                        <span className="font-bold" style={{ color: 'var(--text-dark)' }}>₹{totalPrice.toFixed(2)}</span>
                      </div>
                      {listing.securityDeposit && Number(listing.securityDeposit) > 0 && (
                        <div className="flex justify-between text-xs" style={{ color: 'var(--text-soft)' }}>
                          <span>🔒 Security deposit (refundable)</span>
                          <span>₹{Number(listing.securityDeposit).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
                  <Button type="submit" disabled={booking} className="w-full" size="lg">
                    {booking ? 'Sending request…' : isAuthenticated ? 'Request to Book' : 'Sign in to Book'}
                  </Button>
                </form>
              )}

              {canBook && !success && (
                <div className="mt-3">
                  <Button variant="outline" className="w-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white" asChild>
                    <a href={waUrl} target="_blank" rel="noreferrer">💬 Ask on WhatsApp</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
