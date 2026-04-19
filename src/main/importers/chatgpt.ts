import { readFileSync } from 'node:fs'
import type { ParsedConversation, ParsedMessage, ParseOutput } from './types'
import { findFile } from './fsutil'

interface ChatGPTMessage {
  id?: string
  author?: { role?: string; name?: string | null }
  create_time?: number | null
  content?: {
    content_type?: string
    parts?: unknown[]
  }
  metadata?: Record<string, unknown>
}

interface ChatGPTNode {
  id?: string
  message?: ChatGPTMessage | null
  parent?: string | null
  children?: string[]
}

interface ChatGPTConversation {
  id?: string
  conversation_id?: string
  title?: string | null
  create_time?: number | null
  update_time?: number | null
  current_node?: string
  mapping?: Record<string, ChatGPTNode>
  default_model_slug?: string | null
}

function partsToString(parts: unknown[] | undefined): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .map((p) => {
      if (typeof p === 'string') return p
      if (p && typeof p === 'object') {
        const obj = p as Record<string, unknown>
        if (typeof obj.text === 'string') return obj.text
        if (typeof obj.content_type === 'string') {
          return `[${obj.content_type}]`
        }
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}

function messageContent(m: ChatGPTMessage): string {
  const ct = m.content?.content_type
  if (ct === 'text' || ct === undefined) {
    return partsToString(m.content?.parts)
  }
  // Non-text (tool use, canvas, multimodal) — placeholder, full blob kept in raw_json.
  const fallback = partsToString(m.content?.parts)
  return fallback ? fallback : `[${ct}]`
}

function linearize(
  mapping: Record<string, ChatGPTNode>,
  currentNode: string | undefined,
): string[] {
  if (!currentNode || !mapping[currentNode]) return []
  const path: string[] = []
  let cur: string | null | undefined = currentNode
  const seen = new Set<string>()
  while (cur && mapping[cur] && !seen.has(cur)) {
    seen.add(cur)
    path.push(cur)
    cur = mapping[cur].parent ?? null
  }
  return path.reverse()
}

export function parseChatGPT(folder: string): ParseOutput {
  const jsonPath = findFile(folder, 'conversations.json')
  if (!jsonPath) {
    throw new Error(`ChatGPT importer: conversations.json not found in ${folder}`)
  }
  const raw = readFileSync(jsonPath, 'utf8')
  const data = JSON.parse(raw) as ChatGPTConversation[]
  if (!Array.isArray(data)) {
    throw new Error('ChatGPT importer: expected conversations.json to be an array')
  }

  const conversations: ParsedConversation[] = []

  for (const c of data) {
    const externalId = c.conversation_id ?? c.id
    if (!externalId || !c.mapping) continue

    const orderedIds = linearize(c.mapping, c.current_node)
    const messages: ParsedMessage[] = []
    let seq = 0
    for (const nodeId of orderedIds) {
      const node = c.mapping[nodeId]
      const m = node.message
      if (!m) continue
      const role = m.author?.role
      if (role !== 'user' && role !== 'assistant' && role !== 'system') continue
      // Skip empty hidden system messages
      const content = messageContent(m)
      if (role === 'system' && content.trim().length === 0) continue
      messages.push({
        seq: seq++,
        role,
        content,
        created_at:
          typeof m.create_time === 'number' ? Math.round(m.create_time * 1000) : null,
        raw_json: JSON.stringify(node),
      })
    }

    conversations.push({
      id: `chatgpt:${externalId}`,
      platform: 'chatgpt',
      external_id: externalId,
      title: c.title ?? null,
      created_at:
        typeof c.create_time === 'number' ? Math.round(c.create_time * 1000) : null,
      updated_at:
        typeof c.update_time === 'number' ? Math.round(c.update_time * 1000) : null,
      model: c.default_model_slug ?? null,
      messages,
    })
  }

  return { platform: 'chatgpt', conversations }
}
