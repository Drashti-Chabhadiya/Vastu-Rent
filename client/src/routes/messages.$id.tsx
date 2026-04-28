import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { messages as messagesApi } from '../lib/api'
import type { Message } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'

export const Route = createFileRoute('/messages/$id')({
  loader: ({ params }) => messagesApi.conversation(params.id),
  component: ConversationPage,
})

function ConversationPage() {
  const conversation = Route.useLoaderData()
  const { id: conversationId } = Route.useParams()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const socket = useSocket()

  const [messages, setMessages] = useState<Message[]>(
    conversation.messages,
  )
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const other = conversation.participants.find((p) => p.id !== user?.id)

  // ── Redirect if not authenticated ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) navigate({ to: '/auth/login' })
  }, [isAuthenticated, navigate])

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    socket.emit('conversation:join', conversationId)
    socket.emit('conversation:read', conversationId)

    const onHistory = (history: Message[]) => {
      setMessages(history)
    }

    const onNew = (msg: Message) => {
      setMessages((prev) => {
        // Deduplicate in case REST and socket both deliver
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // Mark as read immediately since the window is open
      socket.emit('conversation:read', conversationId)
    }

    const onTypingStart = ({ userId }: { userId: string }) => {
      if (userId === user?.id) return
      setTypingUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId],
      )
    }

    const onTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId))
    }

    socket.on('conversation:history', onHistory)
    socket.on('message:new', onNew)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.off('conversation:history', onHistory)
      socket.off('message:new', onNew)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [socket, conversationId, user?.id])

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTyping = useCallback(
    (s: Socket | null) => {
      if (!s) return
      s.emit('typing:start', conversationId)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        s.emit('typing:stop', conversationId)
      }, 2000)
    },
    [conversationId],
  )

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || sending) return

    setSending(true)
    setBody('')

    if (socket?.connected) {
      // Preferred: send via socket for real-time delivery
      socket.emit('message:send', { conversationId, body: trimmed })
      socket.emit('typing:stop', conversationId)
    } else {
      // Fallback: REST
      try {
        const msg = await messagesApi.send({ conversationId, body: trimmed })
        setMessages((prev) => [...prev, msg])
      } catch (err) {
        console.error('[chat] send failed', err)
        setBody(trimmed) // restore on failure
      }
    }

    setSending(false)
  }

  return (
    <main className="page-wrap flex h-[calc(100vh-4rem)] flex-col px-4 pb-4 pt-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="island-shell mb-3 flex items-center gap-3 rounded-2xl p-4">
        <Link
          to="/messages"
          className="text-sm font-semibold text-(--lagoon-deep) no-underline hover:underline"
        >
          ← Back
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--lagoon) text-sm font-bold text-white">
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-(--sea-ink)">
            {other?.name ?? 'Unknown'}
          </p>
          {conversation.listing && (
            <Link
              to="/listings/$id"
              params={{ id: conversation.listing.id }}
              className="truncate text-xs text-(--lagoon-deep) no-underline hover:underline"
            >
              Re: {conversation.listing.title}
            </Link>
          )}
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div className="island-shell flex-1 overflow-y-auto rounded-2xl p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-(--sea-ink-soft)">
            No messages yet. Say hello!
          </p>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender.id === user?.id
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                {!isMine && (
                  <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-(--lagoon) text-xs font-bold text-white">
                    {msg.sender.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt={msg.sender.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      msg.sender.name[0]
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? 'rounded-br-sm bg-(--lagoon-deep) text-white'
                      : 'rounded-bl-sm bg-(--surface-strong) text-(--sea-ink)'
                  }`}
                >
                  <p className="m-0 leading-relaxed">{msg.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isMine ? 'text-white/60' : 'text-(--sea-ink-soft)'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-(--surface-strong) px-4 py-2.5">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-(--sea-ink-soft) [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-(--sea-ink-soft) [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-(--sea-ink-soft) [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* ── Compose bar ─────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="island-shell mt-3 flex items-end gap-3 rounded-2xl p-3"
      >
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            handleTyping(socket)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-(--line) bg-(--surface-strong) px-4 py-2.5 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="shrink-0 rounded-full bg-(--lagoon-deep) px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--lagoon) disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  )
}
