import { useEffect, useRef, useState, type FC } from 'react'

interface Props {
  onImport: () => void
  onExport: () => void
}

export const SidebarFooter: FC<Props> = ({ onImport, onExport }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="absolute bottom-3 right-3 z-10">
      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 rounded-lg border border-app shadow-lg py-1 bg-panel-2 min-w-[140px]"
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
            onClick={() => {
              setOpen(false)
              onImport()
            }}
          >
            Import…
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
            onClick={() => {
              setOpen(false)
              onExport()
            }}
          >
            Export…
          </button>
        </div>
      )}
      <button
        aria-label="Import / Export"
        className="w-9 h-9 rounded-full bg-panel-2 border border-app shadow-md hover:bg-white/10 flex items-center justify-center"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
    </div>
  )
}
