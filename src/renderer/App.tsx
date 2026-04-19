import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { ImportDialog } from './components/ImportDialog'
import { ExportDialog } from './components/ExportDialog'

export function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="h-full w-full flex">
      <div className="relative h-full">
        <Sidebar
          selectedId={selectedId}
          onSelect={setSelectedId}
          onImport={() => setImportOpen(true)}
          onExport={() => setExportOpen(true)}
        />
      </div>
      <main className="flex-1 h-full min-w-0">
        <ChatView conversationId={selectedId} />
      </main>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}
