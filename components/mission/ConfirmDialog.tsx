'use client'

interface Props {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, loading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass hud-corners p-6 w-full max-w-sm mx-4">
        <p className="hud-label mb-2">{title}</p>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="hud-btn px-4 py-1.5 text-sm disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="hud-btn px-4 py-1.5 text-sm border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          >
            {loading ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
