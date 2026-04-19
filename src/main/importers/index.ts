import type { Platform } from '@shared/types'
import { parseClaude } from './claude'
import { parseChatGPT } from './chatgpt'
import { parseGemini } from './gemini'
import type { ParseOutput } from './types'

export { detectPlatform } from './detect'
export type { ParsedConversation, ParsedMessage, ParseOutput } from './types'

export function parseFolder(folder: string, platform: Platform): ParseOutput {
  switch (platform) {
    case 'claude':
      return parseClaude(folder)
    case 'chatgpt':
      return parseChatGPT(folder)
    case 'gemini':
      return parseGemini(folder)
    default: {
      const _exhaustive: never = platform
      throw new Error(`Unknown platform: ${String(_exhaustive)}`)
    }
  }
}
