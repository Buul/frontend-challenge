import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Mirrors Tailwind's `md` breakpoint: below it the home renders the mobile layout. */
export const useIsMobile = () => useMediaQuery('(max-width: 767.98px)')
