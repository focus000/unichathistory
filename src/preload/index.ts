import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/ipc-channels'
import type {
  ConversationRow,
  ImportProgress,
  ImportResult,
  MessageRow,
  Platform,
  SearchHit,
  Settings,
} from '../shared/types'

export type ExportFormat = 'markdown' | 'json'

const api = {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(CHANNELS.settingsGet),
    set: (partial: Partial<Settings>): Promise<Settings> =>
      ipcRenderer.invoke(CHANNELS.settingsSet, partial),
  },
  dialog: {
    selectFolder: (): Promise<string | null> =>
      ipcRenderer.invoke(CHANNELS.dialogSelectFolder),
  },
  import: {
    run: (arg: { folder: string; platform?: Platform }): Promise<ImportResult> =>
      ipcRenderer.invoke(CHANNELS.importRun, arg),
    onProgress: (cb: (p: ImportProgress) => void): (() => void) => {
      const handler = (_e: unknown, p: ImportProgress) => cb(p)
      ipcRenderer.on(CHANNELS.importProgress, handler)
      return () => ipcRenderer.removeListener(CHANNELS.importProgress, handler)
    },
  },
  export: {
    run: (opts: {
      convIds?: string[]
      format: ExportFormat
      destFolder: string
    }): Promise<{ fileCount: number }> => ipcRenderer.invoke(CHANNELS.exportRun, opts),
  },
  conversations: {
    list: (filter?: {
      platform?: Platform
      limit?: number
      offset?: number
    }): Promise<ConversationRow[]> =>
      ipcRenderer.invoke(CHANNELS.conversationsList, filter ?? {}),
    get: (id: string): Promise<ConversationRow | undefined> =>
      ipcRenderer.invoke(CHANNELS.conversationsGet, id),
  },
  messages: {
    list: (conversationId: string): Promise<MessageRow[]> =>
      ipcRenderer.invoke(CHANNELS.messagesList, conversationId),
  },
  search: {
    fts: (arg: {
      query: string
      limit?: number
      offset?: number
    }): Promise<SearchHit[]> => ipcRenderer.invoke(CHANNELS.searchFts, arg),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
