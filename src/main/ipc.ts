import { BrowserWindow, dialog, ipcMain } from 'electron'
import { CHANNELS } from '@shared/ipc-channels'
import type {
  ImportResult,
  Platform,
  Settings,
} from '@shared/types'
import { getSettings, setSettings } from './settings'
import { archiveFolder } from './archive'
import { detectPlatform, parseFolder } from './importers'
import {
  getConversation,
  insertBatch,
  listConversations,
  listMessages,
  searchFts,
  updateBatchCount,
  upsertConversation,
} from './db/queries'
import { openDb } from './db'
import { runExport, type ExportFormat } from './exporter'

export function registerIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(CHANNELS.settingsGet, (): Settings => getSettings())

  ipcMain.handle(
    CHANNELS.settingsSet,
    (_e, partial: Partial<Settings>): Settings => {
      const next = setSettings(partial)
      if (partial.storagePath) {
        openDb(next.storagePath)
      }
      return next
    },
  )

  ipcMain.handle(CHANNELS.dialogSelectFolder, async (): Promise<string | null> => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      properties: ['openDirectory'],
      title: 'Select export folder',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(
    CHANNELS.importRun,
    async (
      _e,
      arg: { folder: string; platform?: Platform },
    ): Promise<ImportResult> => {
      const win = getMainWindow()
      const emit = (payload: {
        phase: 'archiving' | 'parsing' | 'writing' | 'done'
        current: number
        total: number
        message?: string
      }) => {
        win?.webContents.send(CHANNELS.importProgress, payload)
      }

      const platform = arg.platform ?? detectPlatform(arg.folder)
      if (!platform) {
        throw new Error('Could not detect platform — pick one manually.')
      }

      emit({ phase: 'archiving', current: 0, total: 1 })
      const settings = getSettings()
      const { batchId, archivePath } = await archiveFolder(
        settings.storagePath,
        platform,
        arg.folder,
      )

      emit({ phase: 'parsing', current: 0, total: 1 })
      // Parse from the archive copy — safer if the user edits the source later.
      const parsed = parseFolder(archivePath, platform)

      const importedAt = Date.now()
      insertBatch({
        id: batchId,
        platform,
        source_folder: arg.folder,
        archive_path: archivePath,
        imported_at: importedAt,
        conversation_count: 0,
      })

      let messageCount = 0
      const total = parsed.conversations.length
      for (let i = 0; i < total; i++) {
        const c = parsed.conversations[i]
        upsertConversation(batchId, c)
        messageCount += c.messages.length
        if (i % 5 === 0 || i === total - 1) {
          emit({ phase: 'writing', current: i + 1, total })
        }
      }
      updateBatchCount(batchId, total)
      emit({ phase: 'done', current: total, total })

      return {
        batchId,
        platform,
        conversationCount: total,
        messageCount,
        archivePath,
      }
    },
  )

  ipcMain.handle(
    CHANNELS.exportRun,
    async (
      _e,
      opts: { convIds?: string[]; format: ExportFormat; destFolder: string },
    ) => {
      return runExport(opts)
    },
  )

  ipcMain.handle(
    CHANNELS.conversationsList,
    (_e, filter: { platform?: Platform; limit?: number; offset?: number }) => {
      return listConversations(filter ?? {})
    },
  )

  ipcMain.handle(CHANNELS.conversationsGet, (_e, id: string) => {
    return getConversation(id)
  })

  ipcMain.handle(CHANNELS.messagesList, (_e, conversationId: string) => {
    return listMessages(conversationId)
  })

  ipcMain.handle(
    CHANNELS.searchFts,
    (_e, arg: { query: string; limit?: number; offset?: number }) => {
      return searchFts(arg.query, arg.limit ?? 50, arg.offset ?? 0)
    },
  )
}
