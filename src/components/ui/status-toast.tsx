import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const DISMISS_AFTER_MS = 4000

type Toast = { id: number; message: string }

export function useStatusToast() {
  const [toast, setToast] = useState<Toast>()
  // The id makes a repeated message restart the timer and be announced again.
  const show = useCallback((message: string) => setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message })), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), DISMISS_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  return { toast, show }
}

/** The live region stays mounted so screen readers pick up messages added later. */
export function StatusToast({ toast, className, style }: { toast?: Toast; className?: string; style?: CSSProperties }) {
  return (
    <div role="status" className={cn('pointer-events-none fixed inset-x-6 z-50 flex justify-center', className)} style={style}>
      {toast && (
        <p
          key={toast.id}
          className="max-w-[366px] rounded-2xl border border-border bg-surface-raised px-4 py-3 text-center text-sm leading-5 text-foreground shadow-lg"
        >
          {toast.message}
        </p>
      )}
    </div>
  )
}
