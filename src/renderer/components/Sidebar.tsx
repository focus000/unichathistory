import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type FC } from 'react'
import type { ConversationRow, Platform } from '../../shared/types'
import { GROUP_ORDER, groupLabel } from '../lib/date-groups'
import { SidebarFooter } from './SidebarFooter'

const PLATFORM_COLOR: Record<Platform, string> = {
  claude: '#d9734e',
  chatgpt: '#10a37f',
  gemini: '#4285f4',
}

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'claude', label: 'Claude' },
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'gemini', label: 'Gemini' },
]

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
  onImport: () => void
  onExport: () => void
}

export const Sidebar: FC<Props> = ({ selectedId, onSelect, onImport, onExport }) => {
  const [platform, setPlatform] = useState<Platform | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const listQuery = useQuery({
    queryKey: ['conversations', platform],
    queryFn: () =>
      window.api.conversations.list({
        platform: platform === 'all' ? undefined : platform,
        limit: 500,
      }),
  })

  const searchResults = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () =>
      window.api.search.fts({ query: searchQuery, limit: 100 }),
    enabled: searchQuery.trim().length >= 2,
  })

  const grouped = useMemo(() => {
    const groups: Record<string, ConversationRow[]> = {}
    for (const c of listQuery.data ?? []) {
      const ts = c.updated_at ?? c.created_at ?? null
      const label = groupLabel(ts)
      groups[label] = groups[label] ?? []
      groups[label].push(c)
    }
    return groups
  }, [listQuery.data])

  const groupKeys = useMemo(() => {
    const keys = Object.keys(grouped)
    return [
      ...GROUP_ORDER.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !GROUP_ORDER.includes(k) && k !== 'Undated').sort(
        (a, b) => (a < b ? 1 : -1),
      ),
      ...(keys.includes('Undated') ? ['Undated'] : []),
    ]
  }, [grouped])

  const showingSearch = searchQuery.trim().length >= 2

  return (
    <aside
      className="relative flex flex-col h-full border-r border-app bg-panel"
      style={{ width: 280 }}
    >
      <div className="flex-none px-3 pt-4 pb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages…"
          className="w-full px-3 py-2 rounded-md bg-panel-2 border border-app text-sm outline-none focus:border-gray-500"
        />
        <div className="flex gap-1 mt-2 flex-wrap">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPlatform(f.key)}
              className={`text-xs px-2 py-1 rounded-full border transition ${
                platform === f.key
                  ? 'bg-white/10 border-white/20'
                  : 'border-app hover:border-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-16">
        {showingSearch ? (
          <div className="mt-2">
            <div className="text-xs text-muted px-2 mb-1">
              {searchResults.isLoading
                ? 'Searching…'
                : `${searchResults.data?.length ?? 0} hits`}
            </div>
            {(searchResults.data ?? []).map((hit, idx) => (
              <button
                key={`${hit.conversation_id}-${idx}`}
                onClick={() => onSelect(hit.conversation_id)}
                className="w-full text-left px-2 py-2 rounded-md hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ background: PLATFORM_COLOR[hit.platform] }}
                  />
                  <span className="text-sm truncate">
                    {hit.title ?? '(untitled)'}
                  </span>
                </div>
                <div
                  className="text-xs text-muted mt-0.5 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: hit.snippet }}
                />
              </button>
            ))}
          </div>
        ) : (
          groupKeys.map((k) => (
            <div key={k} className="mt-3">
              <div className="text-xs text-muted px-2 mb-1">{k}</div>
              {grouped[k].map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`w-full text-left px-2 py-2 rounded-md flex items-center gap-2 transition ${
                    selectedId === c.id
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ background: PLATFORM_COLOR[c.platform] }}
                  />
                  <span className="text-sm truncate">
                    {c.title ?? '(untitled)'}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <SidebarFooter onImport={onImport} onExport={onExport} />
    </aside>
  )
}
