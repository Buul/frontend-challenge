import { useCallback, useEffect, useRef, useState } from 'react'

const strideOf = (element: HTMLElement) => element.clientWidth + (Number.parseFloat(getComputedStyle(element).columnGap) || 0)

/**
 * Tracks the visible "page" of a horizontally scrolling, scroll-snapped list, where a page is
 * one viewport width of the list. Native scrolling and swiping stay the source of truth.
 */
export function useSnapCarousel<T extends HTMLElement>(itemCount: number) {
  const ref = useRef<T>(null)
  const [state, setState] = useState({ page: 0, pages: 1 })

  const measure = useCallback(() => {
    const element = ref.current
    if (!element) return
    const stride = strideOf(element)
    const gap = stride - element.clientWidth
    // The epsilon absorbs sub-pixel rounding so a list that exactly fills N pages doesn't report N + 1.
    const pages = Math.max(1, Math.ceil((element.scrollWidth + gap) / stride - 0.01))
    const atEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 1
    const page = atEnd ? pages - 1 : Math.round(element.scrollLeft / stride)
    setState((prev) => (prev.page === page && prev.pages === pages ? prev : { page, pages }))
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [measure, itemCount])

  const scrollToPage = useCallback((page: number) => {
    const element = ref.current
    if (!element) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollTo({ left: page * strideOf(element), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [])

  return { ref, ...state, scrollToPage }
}
