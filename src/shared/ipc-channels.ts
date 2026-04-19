export const CHANNELS = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  importRun: 'import:run',
  importProgress: 'import:progress',
  exportRun: 'export:run',
  conversationsList: 'conversations:list',
  conversationsGet: 'conversations:get',
  messagesList: 'messages:list',
  searchFts: 'search:fts',
  dialogSelectFolder: 'dialog:selectFolder',
} as const

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS]
