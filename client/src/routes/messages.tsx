import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { messages as messagesApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/messages')({
  loader: () => messagesApi.conversations(),
  component: MessagesPage,
})

function MessagesPage() {
  const conversations = Route.useLoaderData()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    navigate({ to: '/auth/login' })
    return null
  }

  return (
    <main className="page-wrap px-4 pb-16 pt-8">
      <h1 className="display-title mb-6 text-3xl font-bold text-(--sea-ink)">
        Messages
      </h1>

      {conversations.length === 0 ? (
        <div className="island-shell rounded-2xl p-10 text-center text-(--sea-ink-soft)">
          <p className="text-4xl">💬</p>
          <p className="mt-2 font-semibold">No conversations yet</p>
          <p className="text-sm">
            Start a conversation by messaging a listing owner.
          </p>
          <Link
            to="/listings"
            className="mt-4 inline-block text-sm font-semibold text-(--lagoon-deep) no-underline hover:underline"
          >
            Browse listings →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = conv.participants.find((p) => p.id !== user?.id)
            const lastMsg = conv.messages[0]

            return (
              <Link
                key={conv.id}
                to="/messages/$id"
                params={{ id: conv.id }}
                className="island-shell flex items-center gap-4 rounded-2xl border border-(--line) p-4 no-underline transition hover:-translate-y-0.5"
              >
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--lagoon) text-lg font-bold text-white">
                  {other?.avatarUrl ? (
                    <img
                      src={other.avatarUrl}
                      alt={other.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (other?.name?.[0] ?? '?')
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold text-(--sea-ink)">
                      {other?.name ?? 'Unknown'}
                    </p>
                    <p className="shrink-0 text-xs text-(--sea-ink-soft)">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {conv.listing && (
                    <p className="truncate text-xs text-(--lagoon-deep)">
                      Re: {conv.listing.title}
                    </p>
                  )}
                  {lastMsg && (
                    <p className="truncate text-sm text-(--sea-ink-soft)">
                      {lastMsg.sender.id === user?.id ? 'You: ' : ''}
                      {lastMsg.body}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
