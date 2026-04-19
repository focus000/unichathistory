import { useState, type FC } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export const ExportDialog: FC<Props> = ({ open, onClose }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown')
  const [folder, setFolder] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const pickFolder = async () => {
    const picked = await window.api.dialog.selectFolder()
    if (picked) setFolder(picked)
  }

  const runExport = async () => {
    if (!folder) return
    setRunning(true)
    setError(null)
    try {
      const r = await window.api.export.run({ format, destFolder: folder })
      setResult(r.fileCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const close = () => {
    setFormat('markdown')
    setFolder(null)
    setResult(null)
    setError(null)
    setRunning(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-panel border border-app rounded-lg w-[480px] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Export all conversations</h2>
          <button onClick={close} className="text-muted hover:text-white" aria-label="Close">✕</button>
        </div>

        {result === null && (
          <>
            <div className="mb-4">
              <div className="text-sm text-muted mb-2">Format</div>
              <div className="flex gap-2">
                {(['markdown', 'json'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1.5 text-sm rounded border capitalize ${
                      format === f
                        ? 'bg-white/10 border-white/20'
                        : 'border-app hover:border-white/20'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-muted mb-2">Destination folder</div>
              <button
                onClick={pickFolder}
                className="w-full text-left px-3 py-2 rounded border border-app bg-panel-2 hover:border-white/20 text-sm"
              >
                {folder ?? 'Choose folder…'}
              </button>
            </div>
            {error && (
              <div className="mb-4 px-3 py-2 rounded bg-red-900/40 border border-red-800 text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={close}
                className="px-4 py-2 text-sm rounded border border-app hover:bg-white/5"
                disabled={running}
              >
                Cancel
              </button>
              <button
                onClick={runExport}
                disabled={!folder || running}
                className="px-4 py-2 text-sm rounded border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                {running ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </>
        )}

        {result !== null && (
          <div>
            <div className="mb-4 text-sm">
              Exported <b>{result}</b> files to {folder}.
            </div>
            <div className="flex justify-end">
              <button
                onClick={close}
                className="px-4 py-2 text-sm rounded border border-white/20 bg-white/10 hover:bg-white/15"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
