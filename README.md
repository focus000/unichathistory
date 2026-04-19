# UniChatHistory

A desktop app that imports, archives, and browses chat history from **Claude.ai**, **ChatGPT**, and **Google Gemini** in one place. UI mirrors the Claude app: a conversation sidebar on the left and messages on the right, with user messages in bubbles and assistant messages rendered as Markdown.

## Features

- **Unified importer** for three export formats:
  - Claude.ai — `conversations.json` array (`uuid` / `chat_messages` / `content[]` blocks)
  - ChatGPT — `conversations.json` with the `mapping` tree; only the `current_node → root` path is rendered, branches stay in the raw archive
  - Google Gemini — Google Takeout `MyActivity.json`, grouped into per-day synthetic sessions
- **Raw archive + parsed store**: the exact folder you import is copied under `<storage>/raw/<platform>/<batch_id>/` untouched; parsed data lands in SQLite with an FTS5 full-text index.
- **Idempotent re-imports** — `<platform>:<external_id>` is the primary key, so importing the same export again replaces the conversation instead of duplicating.
- **Claude-specific handling**: thinking blocks are wrapped in a collapsible `<details>` element; the `"This block is not supported on your current device yet."` placeholder is filtered out; empty conversations are skipped; missing titles are derived from the first user message.
- **Full-text search** across every message (FTS5, `unicode61 remove_diacritics 2`, works with Chinese / CJK).
- **Markdown render** for assistant messages: tables, task lists, syntax-highlighted code, collapsible thinking, raw HTML via `rehype-raw`.

## Requirements

- Node.js 20+ (tested on 25)
- macOS, Windows, or Linux

## Quickstart

```bash
npm install       # installs deps + rebuilds better-sqlite3 for Electron
npm run dev       # launch the app in dev mode (hot reload)
npm test          # vitest for the importers
npm run typecheck # strict TypeScript check
npm run build     # production bundles in out/
npm run dist      # package a native installer (via electron-builder)
```

## Importing your data

Click the ⋯ icon at the bottom-right of the sidebar → **Import…** → pick the platform (or leave *Auto-detect*) → choose the **folder** containing the export.

### Where to get each export

| Platform | How |
|---|---|
| **Claude.ai** | Settings → Privacy → Export data. You'll get an email with a ZIP; unzip it and select the folder containing `conversations.json`. |
| **ChatGPT** | Settings → Data controls → Export data. Unzip the email attachment and select the folder containing `conversations.json`. |
| **Gemini** | [takeout.google.com](https://takeout.google.com) → *My Activity* → check only *Gemini Apps Activity*. Unzip, select the folder containing `MyActivity.json`. |

The importer copies the entire folder into the archive location before parsing — **your original folder is never modified**.

### Storage location

By default: Electron's `userData` directory
- macOS: `~/Library/Application Support/unichathistory/store/`
- Windows: `%APPDATA%/unichathistory/store/`
- Linux: `~/.config/unichathistory/store/`

Change it via settings; the app uses the new path after the next app restart.

## Architecture

```
src/
├── main/                 # Electron main process
│   ├── db/               # better-sqlite3 + FTS5 schema
│   ├── importers/        # one file per platform + detect.ts
│   ├── archive.ts        # recursive folder copy into raw/
│   ├── exporter.ts       # export as Markdown/JSON
│   ├── settings.ts       # electron-store for the storage path + theme
│   ├── ipc.ts            # all ipcMain.handle registrations
│   └── index.ts          # window / lifecycle
├── preload/              # contextBridge — exposes window.api
├── renderer/             # React + Tailwind v4 UI
│   ├── components/       # Sidebar, ChatView, dialogs, message bubbles
│   └── lib/              # date-group helper, typed api.d.ts
└── shared/               # types and IPC channel names shared across processes
```

### Unified schema

Every platform normalizes to:

```ts
interface ParsedConversation {
  id: string             // '<platform>:<external_id>'
  platform: 'claude' | 'chatgpt' | 'gemini'
  external_id: string
  title: string | null
  created_at: number | null
  updated_at: number | null
  model: string | null
  messages: ParsedMessage[]
}

interface ParsedMessage {
  seq: number
  role: 'user' | 'assistant' | 'system'
  content: string        // Markdown (assistant) or plain text (user)
  created_at: number | null
  raw_json: string | null // original blob for future re-parsing
}
```

See [`src/main/importers/types.ts`](src/main/importers/types.ts) and [`src/main/db/schema.ts`](src/main/db/schema.ts) for the full definitions.

## Roadmap

Not yet implemented — tracked here for later.

- [ ] **Smart archive deduplication.** Re-exports from the same account are supersets of earlier ones, so keeping every archive wastes disk. Idea: per `(platform, account)` keep only one archive, but before replacing an existing archive diff it against the incoming one and require that every old conversation ID is present (and every old message is a prefix of the new one). Only delete the old archive after the diff passes; if anything is missing, keep both and surface a warning. Must fail closed — never drop data on a failed check.
- [ ] **Claude Projects.** Claude exports include a project structure (`projects.json` / project folders grouping conversations). Mirror that hierarchy in the sidebar: a collapsible "Projects" section above the flat conversation list, with project-scoped search. Schema needs a `projects` table and a `project_id` FK on `conversations`.
- [ ] **Global search fix + results view.** The current sidebar search is broken — it returns empty for every query. Rework it as a dedicated results pane: matched conversation titles with highlighted snippets from the matching messages, grouped by conversation, with click-through that opens the conversation and scrolls to the matching message. Investigate FTS5 tokenization on the CJK path and the `MATCH` query wrapping in `searchFts()`.

## Limitations

- ChatGPT **branches** are not navigable — only the `current_node` main path is shown. The full mapping is preserved in the raw archive for future UI work.
- Gemini Takeout has no stable schema and no real conversation grouping, so sessions are synthesized per UTC day.
- `rehype-raw` renders raw HTML from message content. This is fine for your own exports, but don't point the importer at untrusted data.

## License

MIT.
