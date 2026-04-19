import { readFileSync } from 'node:fs'
import type { ParsedConversation, ParsedMessage, ParseOutput } from './types'
import { findFile } from './fsutil'

interface ClaudeContentBlock {
  type?: string
  text?: string
  thinking?: string
  summaries?: Array<{ summary?: string }>
  name?: string
  input?: unknown
}

interface ClaudeMessage {
  uuid?: string
  sender?: 'human' | 'assistant' | string
  text?: string
  created_at?: string
  content?: ClaudeContentBlock[] | string
  attachments?: unknown[]
  files?: unknown[]
}

interface ClaudeConversation {
  uuid: string
  name?: string | null
  created_at?: string | null
  updated_at?: string | null
  model?: string | null
  chat_messages?: ClaudeMessage[]
}

const UNSUPPORTED_RE =
  /^\s*This block is not supported on your current device yet\.?\s*$/i

function toEpochMs(v: string | null | undefined): number | null {
  if (!v) return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}

function stripUnsupported(s: string): string {
  if (!s) return ''
  return s
    .split('\n')
    .filter((line) => !UNSUPPORTED_RE.test(line))
    .join('\n')
    .trim()
}

function renderBlock(block: ClaudeContentBlock): string {
  const type = block.type ?? 'text'
  if (type === 'thinking') {
    // Claude sometimes ships `thinking`, sometimes `text`, sometimes a `summaries` array.
    const raw =
      (typeof block.thinking === 'string' && block.thinking) ||
      (typeof block.text === 'string' && block.text) ||
      (Array.isArray(block.summaries)
        ? block.summaries
            .map((s) => s.summary ?? '')
            .filter(Boolean)
            .join('\n\n')
        : '')
    const cleaned = stripUnsupported(raw)
    if (!cleaned) return ''
    // Native <details> is rendered via rehype-raw. Indent the body so markdown inside still parses.
    return `<details class="thinking-block"><summary>Thought process</summary>\n\n${cleaned}\n\n</details>`
  }
  if (type === 'tool_use') {
    const name = typeof block.name === 'string' ? block.name : 'tool'
    return `*[used tool: \`${name}\`]*`
  }
  if (type === 'tool_result') {
    // Usually noisy for a history viewer; keep only if it has text-like payload.
    if (typeof block.text === 'string') {
      const cleaned = stripUnsupported(block.text)
      return cleaned ? `> _(tool result)_\n> ${cleaned.replace(/\n/g, '\n> ')}` : ''
    }
    return ''
  }
  // text + anything unknown with a text field
  const text = typeof block.text === 'string' ? block.text : ''
  return stripUnsupported(text)
}

function messageContent(m: ClaudeMessage): string {
  if (Array.isArray(m.content) && m.content.length > 0) {
    const parts = m.content.map(renderBlock).filter((s) => s.length > 0)
    if (parts.length > 0) return parts.join('\n\n')
  }
  if (typeof m.content === 'string') {
    return stripUnsupported(m.content)
  }
  if (typeof m.text === 'string') {
    return stripUnsupported(m.text)
  }
  return ''
}

function deriveTitle(
  name: string | null | undefined,
  messages: ParsedMessage[],
): string | null {
  if (name && name.trim().length > 0 && name.trim() !== 'Untitled') return name
  const firstUser = messages.find((m) => m.role === 'user' && m.content.trim())
  if (!firstUser) return null
  const flat = firstUser.content
    .replace(/<details[\s\S]*?<\/details>/g, '')
    .replace(/[#*`_>\-\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!flat) return null
  return flat.slice(0, 60)
}

export function parseClaude(folder: string): ParseOutput {
  const jsonPath = findFile(folder, 'conversations.json')
  if (!jsonPath) {
    throw new Error(`Claude importer: conversations.json not found in ${folder}`)
  }
  const raw = readFileSync(jsonPath, 'utf8')
  const data = JSON.parse(raw) as ClaudeConversation[]
  if (!Array.isArray(data)) {
    throw new Error('Claude importer: expected conversations.json to be an array')
  }

  const conversations: ParsedConversation[] = []

  for (const c of data) {
    const rawMsgs = Array.isArray(c.chat_messages) ? c.chat_messages : []

    const parsedMessages: ParsedMessage[] = []
    let seq = 0
    for (const m of rawMsgs) {
      const role =
        m.sender === 'human'
          ? 'user'
          : m.sender === 'assistant'
            ? 'assistant'
            : 'system'
      const content = messageContent(m)
      if (!content.trim()) continue
      parsedMessages.push({
        seq: seq++,
        role,
        content,
        created_at: toEpochMs(m.created_at),
        raw_json: JSON.stringify(m),
      })
    }

    if (parsedMessages.length === 0) continue

    conversations.push({
      id: `claude:${c.uuid}`,
      platform: 'claude',
      external_id: c.uuid,
      title: deriveTitle(c.name, parsedMessages),
      created_at: toEpochMs(c.created_at),
      updated_at: toEpochMs(c.updated_at),
      model: c.model ?? null,
      messages: parsedMessages,
    })
  }

  return { platform: 'claude', conversations }
}
