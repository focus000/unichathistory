import Store from 'electron-store'
import { app } from 'electron'
import { join } from 'node:path'
import type { Settings } from '@shared/types'

type SettingsSchema = {
  storagePath: string
  theme: 'light' | 'dark' | 'system'
}

let store: Store<SettingsSchema> | null = null

function defaultStoragePath(): string {
  return join(app.getPath('userData'), 'store')
}

export function initSettings(): Settings {
  store = new Store<SettingsSchema>({
    name: 'settings',
    defaults: {
      storagePath: defaultStoragePath(),
      theme: 'system',
    },
  })
  return getSettings()
}

export function getSettings(): Settings {
  if (!store) throw new Error('Settings not initialized')
  return {
    storagePath: store.get('storagePath'),
    theme: store.get('theme'),
  }
}

export function setSettings(partial: Partial<Settings>): Settings {
  if (!store) throw new Error('Settings not initialized')
  if (partial.storagePath !== undefined) store.set('storagePath', partial.storagePath)
  if (partial.theme !== undefined) store.set('theme', partial.theme)
  return getSettings()
}
