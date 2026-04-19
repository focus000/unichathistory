# CLAUDE.md

Agent rules for working in this repo. For what the project is and how to run it, read `README.md` first.

## Workflow

- Run `npm test` after changing anything under `src/main/importers/` or `src/main/db/`.
- Run `npm run typecheck` before declaring a task done. The two project configs (`tsconfig.node.json`, `tsconfig.web.json`) are both strict with `noUnusedLocals` — keep it clean.
- Run `npm run build` to confirm electron-vite can bundle all three targets (main / preload / renderer). A passing typecheck does not guarantee a passing build (path-alias misses show up here).
- Never spawn `npm run dev` without stopping it — it launches an Electron window. If you started one, stop the background task when you're done.

## Hard constraints

- **Do not break importer idempotency.** The conversation PK is `<platform>:<external_id>`. `upsertConversation()` uses `DELETE` + `INSERT` inside a transaction. Don't add separate dedupe logic, INSERT OR REPLACE, or update-path branches on top of it.
- **Do not modify `src/main/db/schema.ts` without a migration story.** Every statement uses `CREATE … IF NOT EXISTS`, so existing user DBs will never rerun altered statements. Adding a new table is fine; changing a column on an existing one is not, unless you add migration code to `openDb()`.
- **Do not add backward-compat shims, feature flags, or "old format" fallbacks** in the importers. If the export format changes, update the parser directly — there are no external consumers.
- **Do not bypass the archive step.** Importers parse from the archived copy (`archivePath`), never from the user's original folder. If you reach into `sourceFolder` during parsing, something is wrong.

## Importer conventions

- Each importer lives in `src/main/importers/<platform>.ts` and exports a single `parse<Platform>(folder: string): ParseOutput` function.
- Adding a new platform requires updates in **four** places: `importers/<new>.ts`, `importers/detect.ts`, `importers/index.ts`'s `parseFolder` switch, and `Platform` union in `src/shared/types.ts`. Tests in `importers.test.ts` plus a `fixtures/<new>/` sample are required before merging.
- Keep `ParsedMessage.content` as a string (Markdown for assistant, plain for user). If a block type needs rich display, convert it to Markdown or HTML at parse time — don't invent a new content representation.
- Thinking blocks use `<details class="thinking-block"><summary>Thought process</summary>…</details>`. The CSS depends on that exact class name; don't rename it.
- Placeholder strings to always filter: `"This block is not supported on your current device yet."` — regex lives in `claude.ts`. If you see it elsewhere, reuse the same approach.
- Empty conversations (no non-empty messages after filtering) must be dropped by the importer, not by the UI.

## IPC

- All IPC channels are declared once in `src/shared/ipc-channels.ts`. Don't scatter string literals.
- Handlers are registered in `src/main/ipc.ts`; the preload wrapper in `src/preload/index.ts` is the only thing the renderer is allowed to call.
- When adding a channel: add the name to `CHANNELS`, register a handler in `ipc.ts`, expose a typed method on `api` in the preload, and rely on `Api` type flow-through in `src/renderer/lib/api.d.ts`.

## UI

- User messages use `UserBubble.tsx` (bubble). Assistant messages use `AssistantMessage.tsx` (no bubble, Markdown).
- `AssistantMessage` renders raw HTML via `rehype-raw`. This is safe because content comes from the user's own archives. Don't feed external/untrusted Markdown through it.
- Sidebar footer (`SidebarFooter.tsx`) popover must be `absolute` — if it becomes a layout-flow child the trigger button shifts when it opens.

## Memory

Long-lived context about this project lives in `.claude/projects/-Users-kkwinserver-projects-unichathistory/memory/`. Update it when you learn something non-obvious about the user, the project, or a past correction. Don't record things that are already in this file or in `README.md`.

## Don't

- Don't add comments that just restate the code or reference a past task / issue / PR.
- Don't add a `/docs` tree, generated API docs, or extra README copies in subfolders.
- Don't commit without being asked, and never push unless the user explicitly says so.
- Don't run `npm audit fix --force` in passing — it will break the Electron/native-module lockstep.
