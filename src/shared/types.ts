export type Platform = 'claude' | 'chatgpt' | 'gemini'

export type Role = 'user' | 'assistant' | 'system'

export interface ConversationRow {
  id: string
  platform: Platform
  external_id: string
  title: string | null
  created_at: number | null
  updated_at: number | null
  model: string | null
  message_count: number
  batch_id: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  seq: number
  role: Role
  content: string
  created_at: number | null
  raw_json: string | null
}

export interface AttachmentRow {
  id: string
  message_id: string
  filename: string | null
  mime_type: string | null
  archive_path: string | null
}

export interface ImportBatchRow {
  id: string
  platform: Platform
  source_folder: string
  archive_path: string
  imported_at: number
  conversation_count: number
}

export interface SearchHit {
  conversation_id: string
  title: string | null
  platform: Platform
  snippet: string
  rank: number
}

export interface Settings {
  storagePath: string
  theme: 'light' | 'dark' | 'system'
}

export interface ImportResult {
  batchId: string
  platform: Platform
  conversationCount: number
  messageCount: number
  archivePath: string
}

export interface ImportProgress {
  phase: 'archiving' | 'parsing' | 'writing' | 'done'
  current: number
  total: number
  message?: string
}
