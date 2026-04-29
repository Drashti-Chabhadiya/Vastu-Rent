import { createFileRoute } from '@tanstack/react-router'
import { messages as messagesApi } from '@/lib/api'
import { ConversationPage } from '@/features/messages'

export const Route = createFileRoute('/messages/$id')({
  loader: ({ params }) => messagesApi.conversation(params.id),
  component: function ConversationRoute() {
    const conversation = Route.useLoaderData()
    const { id } = Route.useParams()
    return <ConversationPage conversation={conversation} conversationId={id} />
  },
})
