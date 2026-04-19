import type {
  ConversationRow,
  ImportBatchRow,
  MessageRow,
  Platform,
  SearchHit,
} from '@shared/types'
import { getDb } from './index'

export interface ParsedConversationInput {
  id: string
  platform: Platform
  external_id: string
  title: string | null
  created_at: number | null
  updated_at: number | null
  model: string | null
  messages: Array<{
    seq: number
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: number | null
    raw_json: string | null
  }>
}

export function insertBatch(batch: ImportBatchRow): void {
  const stmt = getDb().prepare(
    `INSERT INTO import_batches (id, platform, source_folder, archive_path, imported_at, conversation_count)
     VALUES (@id, @platform, @source_folder, @archive_path, @imported_at, @conversation_count)`,
  )
  stmt.run(batch)
}

export function updateBatchCount(id: string, count: number): void {
  getDb()
    .prepare(`UPDATE import_batches SET conversation_count = ? WHERE id = ?`)
    .run(count, id)
}

/**
 * Upsert a whole conversation (and all its messages) transactionally.
 * If the conversation already exists we replace it and its messages.
 */
export function upsertConversation(
  batchId: string,
  conv: ParsedConversationInput,
): void {
  const db = getDb()
  const tx = db.transaction((c: ParsedConversationInput) => {
    db.prepare(`DELETE FROM conversations WHERE id = ?`).run(c.id)

    db.prepare(
      `INSERT INTO conversations (id, platform, external_id, title, created_at, updated_at, model, message_count, batch_id)
       VALUES (@id, @platform, @external_id, @title, @created_at, @updated_at, @model, @message_count, @batch_id)`,
    ).run({
      id: c.id,
      platform: c.platform,
      external_id: c.external_id,
      title: c.title,
      created_at: c.created_at,
      updated_at: c.updated_at,
      model: c.model,
      message_count: c.messages.length,
      batch_id: batchId,
    })

    const insertMsg = db.prepare(
      `INSERT INTO messages (id, conversation_id, seq, role, content, created_at, raw_json)
       VALUES (@id, @conversation_id, @seq, @role, @content, @created_at, @raw_json)`,
    )
    for (const m of c.messages) {
      insertMsg.run({
        id: `${c.id}:${m.seq}`,
        conversation_id: c.id,
        seq: m.seq,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
        raw_json: m.raw_json,
      })
    }
  })
  tx(conv)
}

export interface ListFilter {
  platform?: Platform
  search?: string
  limit?: number
  offset?: number
}

export function listConversations(filter: ListFilter = {}): ConversationRow[] {
  const { platform, limit = 200, offset = 0 } = filter
  const clauses: string[] = []
  const params: Record<string, unknown> = {}
  if (platform) {
    clauses.push('platform = @platform')
    params.platform = platform
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const sql = `
    SELECT * FROM conversations
    ${where}
    ORDER BY COALESCE(updated_at, created_at, 0) DESC
    LIMIT @limit OFFSET @offset
  `
  return getDb()
    .prepare(sql)
    .all({ ...params, limit, offset }) as ConversationRow[]
}

export function getConversation(id: string): ConversationRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(id) as ConversationRow | undefined
}

export function listMessages(conversationId: string): MessageRow[] {
  return getDb()
    .prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY seq ASC`)
    .all(conversationId) as MessageRow[]
}

export function searchFts(
  query: string,
  limit = 50,
  offset = 0,
): SearchHit[] {
  if (!query.trim()) return []
  // Wrap query in quotes for safety against FTS operators typed by users.
  // We escape `"` inside the user input by doubling it (FTS5 syntax).
  const safe = `"${query.replace(/"/g, '""')}"`
  const rows = getDb()
    .prepare(
      `
      SELECT
        c.id        AS conversation_id,
        c.title     AS title,
        c.platform  AS platform,
        snippet(messages_fts, 0, '<mark>', '</mark>', '…', 16) AS snippet,
        bm25(messages_fts) AS rank
      FROM messages_fts
      JOIN messages m ON m.rowid = messages_fts.rowid
      JOIN conversations c ON c.id = m.conversation_id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `,
    )
    .all(safe, limit, offset) as SearchHit[]
  return rows
}
