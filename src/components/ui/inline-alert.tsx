import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type InlineAlertProps = {
  message: ReactNode
  /** Omitted for messages without a follow-up action. */
  action?: { label: string; onClick: () => void }
  /** `alert` for failures; unset for content that is already announced elsewhere (e.g. empty results). */
  role?: 'alert' | 'status'
  className?: string
}

/** Card with a message and an optional primary action, used for failed loads and empty results. */
export function InlineAlert({ message, action, role, className }: InlineAlertProps) {
  return (
    <div role={role} className={cn('flex flex-col items-start gap-4 bg-card p-8', className)}>
      <p className="text-muted-foreground">{message}</p>
      {action && (
        <Button onClick={action.onClick} className="rounded-md font-bold">
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** A failed load with a "Tentar novamente" button. */
export function RetryAlert({ message, onRetry, className }: { message: ReactNode; onRetry: () => void; className?: string }) {
  return <InlineAlert role="alert" message={message} action={{ label: 'Tentar novamente', onClick: onRetry }} className={className} />
}
