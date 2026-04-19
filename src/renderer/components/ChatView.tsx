import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { UserBubble } from './UserBubble'
import { AssistantMessage } from './AssistantMessage'

const PLATFORM_COLOR: Record<string, string> = {
  claude: '#d9734e',
  chatgpt: '#10a37f',
  gemini: '#4285f4',
}

interface Props {
  conversationId: string | null
}

export const ChatView: FC<Props> = ({ conversationId }) => {
  const convQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => window.api.conversations.get(conversationId!),
    enabled: !!conversationId,
  })
  const msgQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => window.api.messages.list(conversationId!),
    enabled: !!conversationId,
  })

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        <div className="text-center">
          <div className="text-lg mb-2">Select a conversation</div>
          <div className="text-sm opacity-70">
            Or click the icon at the bottom-right of the sidebar to import your first export.
          </div>
        </div>
      </div>
    )
  }

  const conv = convQuery.data
  const messages = msgQuery.data ?? []

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none px-6 py-4 border-b border-app flex items-center gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: conv ? PLATFORM_COLOR[conv.platform] : '#555' }}
        />
        <h1 className="text-base font-medium truncate">
          {conv?.title ?? 'Loading…'}
        </h1>
        {conv?.model && (
          <span className="text-xs text-muted px-2 py-0.5 rounded bg-panel-2">
            {conv.model}
          </span>
        )}
      </header>
      <div className="flex-1 overflow-y-auto py-4">
        {messages.map((m) =>
          m.role === 'user' ? (
            <UserBubble key={m.id} content={m.content} />
          ) : (
            <AssistantMessage key={m.id} content={m.content} />
          ),
        )}
      </div>
    </div>
  )
}
