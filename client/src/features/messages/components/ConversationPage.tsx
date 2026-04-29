import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { messages as messagesApi, type Message, type Conversation } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'

interface ConversationPageProps {
  conversation:   Conversation
  conversationId: string
}

export function ConversationPage({ conversation, conversationId }: ConversationPageProps) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const socket   = useSocket()

  const [messages,     setMessages]     = useState<Message[]>(conversation.messages)
  const [body,         setBody]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [typingUsers,  setTypingUsers]  = useState<string[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const other = conversation.participants.find((p) => p.id !== user?.id)

  useEffect(() => {
    if (!isAuthenticated) navigate({ to: '/auth/login' })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!socket) return
    socket.emit('conversation:join', conversationId)
    socket.emit('conversation:read', conversationId)

    const onHistory     = (h: Message[]) => setMessages(h)
    const onNew         = (msg: Message) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
      socket.emit('conversation:read', conversationId)
    }
    const onTypingStart = ({ userId }: { userId: string }) => {
      if (userId === user?.id) return
      setTypingUsers((prev) => prev.includes(userId) ? prev : [...prev, userId])
    }
    const onTypingStop  = ({ userId }: { userId: string }) => setTypingUsers((prev) => prev.filter((id) => id !== userId))

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typingUsers])

  const handleTyping = useCallback((s: Socket | null) => {
    if (!s) return
    s.emit('typing:start', conversationId)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => s.emit('typing:stop', conversationId), 2000)
  }, [conversationId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true); setBody('')
    if (socket?.connected) {
      socket.emit('message:send', { conversationId, body: trimmed })
      socket.emit('typing:stop', conversationId)
    } else {
      try {
        const msg = await messagesApi.send({ conversationId, body: trimmed })
        setMessages((prev) => [...prev, msg])
      } catch (err) { console.error('[chat] send failed', err); setBody(trimmed) }
    }
    setSending(false)
  }

  return (
    <main className="page-wrap flex h-[calc(100vh-4rem)] flex-col px-4 pb-4 pt-6">
      {/* Header */}
      <div className="island-shell mb-3 flex items-center gap-3 rounded-2xl p-4">
        <Link to="/messages" className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--brand)' }}>← Back</Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>
          {other?.avatarUrl ? <img src={other.avatarUrl} alt={other.name} className="h-full w-full object-cover" /> : (other?.name?.[0] ?? '?')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" style={{ color: 'var(--text-dark)' }}>{other?.name ?? 'Unknown'}</p>
          {conversation.listing && (
            <Link to="/listings/$id" params={{ id: conversation.listing.id }} className="truncate text-xs no-underline hover:underline" style={{ color: 'var(--brand)' }}>
              Re: {conversation.listing.title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="island-shell flex-1 overflow-y-auto rounded-2xl p-4">
        {messages.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--text-soft)' }}>No messages yet. Say hello!</p>}
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender.id === user?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end overflow-hidden rounded-full text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>
                    {msg.sender.avatarUrl ? <img src={msg.sender.avatarUrl} alt={msg.sender.name} className="h-full w-full object-cover" /> : msg.sender.name[0]}
                  </div>
                )}
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'rounded-br-sm text-white' : 'rounded-bl-sm'}`}
                  style={isMine ? { background: 'var(--brand)' } : { background: 'var(--surface-strong)', color: 'var(--text-dark)' }}>
                  <p className="m-0 leading-relaxed">{msg.body}</p>
                  <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/60' : ''}`} style={!isMine ? { color: 'var(--text-soft)' } : {}}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-2.5" style={{ background: 'var(--surface-strong)' }}>
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-soft)', animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-soft)', animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-soft)', animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="island-shell mt-3 flex items-end gap-3 rounded-2xl p-3">
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); handleTyping(socket) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm outline-none"
          style={{ maxHeight: '120px', overflowY: 'auto', borderColor: 'var(--line)', background: 'var(--surface-strong)', color: 'var(--text-dark)' }}
        />
        <button type="submit" disabled={!body.trim() || sending}
          className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: 'var(--brand)' }}>
          Send
        </button>
      </form>
    </main>
  )
}
