import heartFilled from '@/assets/figma/tab-heart.svg'
import { cn } from '@/lib/utils'

/** The design only has a filled heart in the tab bar; it is used as a mask so it can take the button's color. */
export function FilledHeart({ width, height, className }: { width: number; height: number; className?: string }) {
  const mask = `url("${heartFilled}") center / contain no-repeat`
  return <span aria-hidden className={cn('block', className)} style={{ width, height, mask, WebkitMask: mask }} />
}

export type FavoriteControl = {
  active: boolean
  busy: boolean
  onToggle: () => void
}
