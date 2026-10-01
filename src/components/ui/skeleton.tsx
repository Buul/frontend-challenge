import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-card',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent motion-reduce:before:hidden',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
