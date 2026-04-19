import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { parseClaude } from './claude'
import { parseChatGPT } from './chatgpt'
import { parseGemini } from './gemini'
import { detectPlatform } from './detect'

const FIXTURES = resolve(__dirname, '../../../fixtures')

describe('claude importer', () => {
  const out = parseClaude(resolve(FIXTURES, 'claude'))

  it('returns claude platform', () => {
    expect(out.platform).toBe('claude')
  })

  it('skips empty conversations and ones whose messages were all filtered out', () => {
    // abc-001, abc-002 remain; abc-003 (empty) and abc-004 (only unsupported placeholder) are skipped.
    expect(out.conversations).toHaveLength(2)
    const ids = out.conversations.map((c) => c.external_id).sort()
    expect(ids).toEqual(['abc-001', 'abc-002'])
  })

  it('maps sender=human → role=user', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-001')!
    expect(conv.messages[0].role).toBe('user')
    expect(conv.messages[1].role).toBe('assistant')
  })

  it('wraps thinking blocks in a <details> element so UI can collapse them', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-001')!
    const asst = conv.messages[1]
    expect(asst.content).toContain('<details class="thinking-block"><summary>Thought process</summary>')
    expect(asst.content).toContain('The user wants bubble sort')
    // The visible response text is still there, separate from the thinking block.
    expect(asst.content).toContain('Here is a simple implementation')
  })

  it('filters out the "This block is not supported" placeholder', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-002')!
    const asst = conv.messages.find((m) => m.role === 'assistant')!
    expect(asst.content).not.toMatch(/not supported on your current device/i)
    expect(asst.content).toBe('Use flexbox.')
  })

  it('derives a title from the first user message when name is empty', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-002')!
    expect(conv.title).toBe('How do I center a div in CSS?')
  })

  it('preserves explicit title when present', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-001')!
    expect(conv.title).toBe('Hello Claude')
  })

  it('parses timestamps into epoch ms', () => {
    const conv = out.conversations.find((c) => c.external_id === 'abc-001')!
    expect(conv.created_at).toBe(Date.parse('2025-09-01T10:00:00Z'))
  })
})

describe('chatgpt importer', () => {
  const out = parseChatGPT(resolve(FIXTURES, 'chatgpt'))

  it('linearizes current_node → root path', () => {
    const conv = out.conversations[0]
    // Expected linear path: node-a (user) → node-c (assistant) → node-d (user)
    // node-b is on a dead branch and should NOT appear.
    // node-sys is an empty system message and should be skipped.
    expect(conv.messages).toHaveLength(3)
    expect(conv.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(conv.messages[1].content).toContain('chicken cross the road')
    expect(conv.messages.map((m) => m.content).join('\n')).not.toContain(
      'dead branch',
    )
  })

  it('carries seq in order', () => {
    const conv = out.conversations[0]
    expect(conv.messages.map((m) => m.seq)).toEqual([0, 1, 2])
  })
})

describe('gemini importer', () => {
  const out = parseGemini(resolve(FIXTURES, 'gemini'))

  it('groups events by UTC day into conversations', () => {
    expect(out.conversations).toHaveLength(2)
  })

  it('builds prompt/response message pairs', () => {
    const first = out.conversations[0]
    // Day 2025-09-10 has 2 events → 4 messages (prompt+response × 2)
    expect(first.messages).toHaveLength(4)
    expect(first.messages[0].role).toBe('user')
    expect(first.messages[1].role).toBe('assistant')
  })

  it('strips the "Prompted" prefix in user content', () => {
    const first = out.conversations[0]
    expect(first.messages[0].content).toBe('What is the capital of France?')
  })
})

describe('detectPlatform', () => {
  it('detects Claude export', () => {
    expect(detectPlatform(resolve(FIXTURES, 'claude'))).toBe('claude')
  })
  it('detects ChatGPT export', () => {
    expect(detectPlatform(resolve(FIXTURES, 'chatgpt'))).toBe('chatgpt')
  })
  it('detects Gemini export', () => {
    expect(detectPlatform(resolve(FIXTURES, 'gemini'))).toBe('gemini')
  })
})
