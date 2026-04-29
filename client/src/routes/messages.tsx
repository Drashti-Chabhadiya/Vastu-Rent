import { createFileRoute } from '@tanstack/react-router'
import { messages as messagesApi } from '@/lib/api'
import { MessagesPage } from '@/features/messages'

export const Route = createFileRoute('/messages')({
  loader: () => messagesApi.conversations(),
  component: function MessagesRoute() {
    const conversations = Route.useLoaderData()
    return <MessagesPage conversations={conversations} />
  },
})
