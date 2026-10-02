import { useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'

/**
 * Submit handler for search forms with a `q` field: applies the term to the home market listing.
 * The home search bar scrolls to that listing; the header search stays put.
 */
export function useSearchSubmit(options?: { scrollToMarket?: boolean }) {
  const navigate = useNavigate()
  const scrollToMarket = options?.scrollToMarket ?? true

  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    void navigate({
      to: '/',
      search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
      hash: scrollToMarket ? 'mercado' : '',
    })
  }
}
