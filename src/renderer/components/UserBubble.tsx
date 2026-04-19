import type { FC } from 'react'

interface Props {
  content: string
}

export const UserBubble: FC<Props> = ({ content }) => (
  <div className="flex justify-end px-4 py-2">
    <div
      className="max-w-[80%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap"
      style={{
        background: 'var(--color-bubble-user)',
        color: 'var(--color-app-text)',
      }}
    >
      {content}
    </div>
  </div>
)
