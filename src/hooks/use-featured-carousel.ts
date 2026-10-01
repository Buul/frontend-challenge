import { useState } from 'react'
import type { FeaturedNft } from '@/lib/api/types'
import { formatEth } from '@/lib/format'

/** Shared index, interaction flag and live announcement for the desktop and mobile featured heroes. */
export function useFeaturedCarousel(slides?: FeaturedNft[]) {
  const [active, setActive] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const current = slides?.[active]

  const select = (index: number) => {
    setActive(index)
    setInteracted(true)
  }

  const liveText =
    interacted && slides && current ? `Destaque ${active + 1} de ${slides.length}: ${current.name}, ${formatEth(current.price)}` : ''

  return { active, select, current, liveText }
}
