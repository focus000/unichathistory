import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { ParsedConversation, ParsedMessage, ParseOutput } from './types'
import { findFile } from './fsutil'

/**
 * Google Takeout "My Activity" Gemini export.
 *
 * The activity stream is a flat JSON array of events. Each event is loosely:
 *   {
 *     "title": "…prompt…"            // prompt text (sometimes with "Prompted"/asked prefix)
 *     "titleUrl": "…",
 *     "time": "2025-09-12T10:23:00Z",
 *     "description": "…",            // sometimes holds assistant response
 *     "products": ["Gemini"],
 *     "details": […]
 *   }
 *
 * We flatten into synthetic conversations: consecutive events from the same UTC
 * day are grouped. Each event becomes two messages (user prompt + assistant reply)
 * when both are present. Raw event stored in raw_json so richer parsing can be
 * added without re-importing.
 */

interface TakeoutEvent {
  title?: string
  time?: string
  description?: string
  header?: string
  products?: string[]
  details?: unknown
  subtitles?: Array<{ name?: string }>
}

function dayKey(iso: string | undefined): string {
  if (!iso) return 'unknown'
  return iso.slice(0, 10)
}

function shortHash(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12)
}

function stripPrefix(title: string): string {
  return title
    .replace(/^Prompted\s+/i, '')
    .replace(/^Asked\s+/i, '')
    .replace(/^You said:\s*/i, '')
    .trim()
}

export function parseGemini(folder: string): ParseOutput {
  const jsonPath =
    findFile(folder, 'MyActivity.json') ?? findFile(folder, 'My Activity.json')
  if (!jsonPath) {
    throw new Error(
      `Gemini importer: MyActivity.json not found in ${folder} (expected Google Takeout export)`,
    )
  }
  const raw = readFileSync(jsonPath, 'utf8')
  const events = JSON.parse(raw) as TakeoutEvent[]
  if (!Array.isArray(events)) {
    throw new Error('Gemini importer: expected MyActivity.json to be an array of events')
  }

  // Sort oldest → newest so dayKey grouping is stable.
  const sorted = [...events].sort((a, b) => {
    const ta = a.time ? Date.parse(a.time) : 0
    const tb = b.time ? Date.parse(b.time) : 0
    return ta - tb
  })

  const byDay = new Map<string, TakeoutEvent[]>()
  for (const ev of sorted) {
    const key = dayKey(ev.time)
    const bucket = byDay.get(key) ?? []
    bucket.push(ev)
    byDay.set(key, bucket)
  }

  const conversations: ParsedConversation[] = []
  for (const [day, bucket] of byDay.entries()) {
    const firstTs = bucket[0]?.time ? Date.parse(bucket[0].time) : null
    const lastTs = bucket[bucket.length - 1]?.time
      ? Date.parse(bucket[bucket.length - 1].time!)
      : null
    const firstPrompt = stripPrefix(bucket[0]?.title ?? '')
    const title = firstPrompt.length > 0 ? firstPrompt.slice(0, 60) : `Gemini ${day}`
    const externalId = `${day}-${shortHash(day + bucket.length)}`

    const messages: ParsedMessage[] = []
    let seq = 0
    for (const ev of bucket) {
      const ts = ev.time ? Date.parse(ev.time) : null
      const prompt = stripPrefix(ev.title ?? '')
      if (prompt.length > 0) {
        messages.push({
          seq: seq++,
          role: 'user',
          content: prompt,
          created_at: ts,
          raw_json: JSON.stringify(ev),
        })
      }
      if (typeof ev.description === 'string' && ev.description.length > 0) {
        messages.push({
          seq: seq++,
          role: 'assistant',
          content: ev.description,
          created_at: ts,
          raw_json: null,
        })
      }
    }

    if (messages.length === 0) continue
    conversations.push({
      id: `gemini:${externalId}`,
      platform: 'gemini',
      external_id: externalId,
      title,
      created_at: firstTs,
      updated_at: lastTs,
      model: null,
      messages,
    })
  }

  return { platform: 'gemini', conversations }
}
