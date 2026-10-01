import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Shared page width and side padding; callers add gap and breakpoint padding. */
export function PageShell({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn('mx-auto flex max-w-[1440px] flex-col xl:px-[120px]', className)} style={style}>
      {children}
    </div>
  )
}
