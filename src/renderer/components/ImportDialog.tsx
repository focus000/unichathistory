import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FC } from 'react'
import type { ImportProgress, ImportResult, Platform } from '../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

const PLATFORMS: Array<{ key: Platform; label: string; hint: string }> = [
  {
    key: 'claude',
    label: 'Claude',
    hint: 'Select the folder containing conversations.json (from claude.ai export ZIP).',
  },
  {
    key: 'chatgpt',
    label: 'ChatGPT',
    hint: 'Select the folder containing conversations.json (from OpenAI export ZIP).',
  },
  {
    key: 'gemini',
    label: 'Gemini',
    hint: 'Select the Google Takeout folder containing My Activity/MyActivity.json.',
  },
]

export const ImportDialog: FC<Props> = ({ open, onClose }) => {
  const qc = useQueryClient()
  const [platform, setPlatform] = useState<Platform | 'auto'>('auto')
  const [folder, setFolder] = useState<string | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) {
      setPlatform('auto')
      setFolder(null)
      setProgress(null)
      setResult(null)
      setError(null)
      setRunning(false)
      return
    }
    const off = window.api.import.onProgress((p) => setProgress(p))
    return off
  }, [open])

  if (!open) return null

  const pickFolder = async () => {
    const picked = await window.api.dialog.selectFolder()
    if (picked) setFolder(picked)
  }

  const runImport = async () => {
    if (!folder) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const r = await window.api.import.run({
        folder,
        platform: platform === 'auto' ? undefined : platform,
      })
      setResult(r)
      qc.invalidateQueries({ queryKey: ['conversations'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-panel border border-app rounded-lg w-[520px] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Import chat history</h2>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close">✕</button>
        </div>

        {!result && (
          <>
            <div className="mb-4">
              <div className="text-sm text-muted mb-2">Platform</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPlatform('auto')}
                  className={`px-3 py-1.5 text-sm rounded border ${
                    platform === 'auto'
                      ? 'bg-white/10 border-white/20'
                      : 'border-app hover:border-white/20'
                  }`}
                >
                  Auto-detect
                </button>
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`px-3 py-1.5 text-sm rounded border ${
                      platform === p.key
                        ? 'bg-white/10 border-white/20'
                        : 'border-app hover:border-white/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {platform !== 'auto' && (
                <div className="text-xs text-muted mt-2">
                  {PLATFORMS.find((p) => p.key === platform)?.hint}
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="text-sm text-muted mb-2">Folder</div>
              <button
                onClick={pickFolder}
                className="w-full text-left px-3 py-2 rounded border border-app bg-panel-2 hover:border-white/20 text-sm"
              >
                {folder ?? 'Choose folder…'}
              </button>
            </div>

            {progress && running && (
              <div className="mb-4">
                <div className="text-xs text-muted mb-1">
                  {progress.phase}{' '}
                  {progress.total > 0 && `(${progress.current}/${progress.total})`}
                </div>
                <div className="h-1.5 bg-panel-2 rounded overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${
                        progress.total > 0
                          ? (progress.current / progress.total) * 100
                          : 0
                      }%`,
                      background: 'var(--color-app-accent)',
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 px-3 py-2 rounded bg-red-900/40 border border-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded border border-app hover:bg-white/5"
                disabled={running}
              >
                Cancel
              </button>
              <button
                onClick={runImport}
                disabled={!folder || running}
                className="px-4 py-2 text-sm rounded border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                {running ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div>
            <div className="mb-3 text-sm">
              Imported <b>{result.conversationCount}</b> conversations and{' '}
              <b>{result.messageCount}</b> messages.
            </div>
            <div className="text-xs text-muted break-all mb-4">
              Archived at: {result.archivePath}
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
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
