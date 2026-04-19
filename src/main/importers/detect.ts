import { readFileSync } from 'node:fs'
import type { Platform } from '@shared/types'
import { findDir, findFile } from './fsutil'

export function detectPlatform(folder: string): Platform | null {
  // Gemini first (Takeout has distinctive path)
  if (
    findFile(folder, 'MyActivity.json') ||
    findFile(folder, 'My Activity.json') ||
    findDir(folder, 'Gemini') ||
    findDir(folder, 'Gemini Apps')
  ) {
    const jsonPath =
      findFile(folder, 'MyActivity.json') ?? findFile(folder, 'My Activity.json')
    if (jsonPath) return 'gemini'
  }

  const convPath = findFile(folder, 'conversations.json')
  if (!convPath) return null

  try {
    // Peek first 4KB to distinguish Claude (array of {chat_messages}) vs ChatGPT (array of {mapping}).
    const head = readFileSync(convPath, 'utf8').slice(0, 4096)
    if (head.includes('"mapping"')) return 'chatgpt'
    if (head.includes('"chat_messages"')) return 'claude'
    // Fallback: ChatGPT usually has `current_node`; Claude usually has `uuid` and `name`.
    if (head.includes('"current_node"')) return 'chatgpt'
  } catch {
    return null
  }
  return null
}
