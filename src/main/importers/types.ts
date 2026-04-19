import type { Platform, Role } from '@shared/types'

export interface ParsedMessage {
  seq: number
  role: Role
  content: string
  created_at: number | null
  raw_json: string | null
}

export interface ParsedConversation {
  id: string           // '<platform>:<external_id>'
  platform: Platform
  external_id: string
  title: string | null
  created_at: number | null
  updated_at: number | null
  model: string | null
  messages: ParsedMessage[]
}

export interface ParseOutput {
  platform: Platform
  conversations: ParsedConversation[]
}

export type ProgressCallback = (current: number, total: number) => void
