import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConversationRow, MessageRow } from '@shared/types'
import { getConversation, listConversations, listMessages } from './db/queries'

export type ExportFormat = 'markdown' | 'json'

export interface ExportOptions {
  convIds?: string[]
  format: ExportFormat
  destFolder: string
}

function safeFilename(s: string): string {
  return s.replace(/[^\p{L}\p{N}\-_.]+/gu, '_').slice(0, 80)
}

function toMarkdown(conv: ConversationRow, messages: MessageRow[]): string {
  const lines: string[] = []
  lines.push(`# ${conv.title ?? conv.external_id}`)
  lines.push('')
  lines.push(`- **Platform:** ${conv.platform}`)
  if (conv.model) lines.push(`- **Model:** ${conv.model}`)
  if (conv.created_at)
    lines.push(`- **Created:** ${new Date(conv.created_at).toISOString()}`)
  lines.push('')
  for (const m of messages) {
    const label = m.role === 'user' ? '**User**' : m.role === 'assistant' ? '**Assistant**' : `**${m.role}**`
    lines.push(`---`)
    lines.push('')
    lines.push(label)
    lines.push('')
    lines.push(m.content)
    lines.push('')
  }
  return lines.join('\n')
}

export async function runExport(opts: ExportOptions): Promise<{ fileCount: number }> {
  await mkdir(opts.destFolder, { recursive: true })
  const targets: ConversationRow[] = opts.convIds && opts.convIds.length > 0
    ? (opts.convIds
        .map((id) => getConversation(id))
        .filter((c): c is ConversationRow => !!c))
    : listConversations({ limit: 100000 })

  let count = 0
  for (const conv of targets) {
    const messages = listMessages(conv.id)
    const basename = safeFilename(`${conv.platform}-${conv.title ?? conv.external_id}`)
    if (opts.format === 'markdown') {
      await writeFile(join(opts.destFolder, `${basename}.md`), toMarkdown(conv, messages))
    } else {
      await writeFile(
        join(opts.destFolder, `${basename}.json`),
        JSON.stringify({ conversation: conv, messages }, null, 2),
      )
    }
    count++
  }
  return { fileCount: count }
}
