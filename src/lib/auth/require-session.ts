import type { QueryClient } from '@tanstack/react-query'
import { redirect, type ParsedLocation } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/lib/api/auth'
import { authIntent } from './auth-dialog'

type GuardArgs = { context: { queryClient: QueryClient }; location: ParsedLocation; preload: boolean }

/** Where a private screen sends a visitor, and why. */
type GuardOptions = { fallback: '/' | '/cart'; notice: string }

/**
 * `beforeLoad` guard for private screens (payment, profile, wallets): a visitor is taken to `fallback` with the login
 * dialog open, and comes back to the same screen, search included, after signing in.
 */
export async function requireSession({ context, location, preload }: GuardArgs, { fallback, notice }: GuardOptions) {
  const session = await context.queryClient.ensureQueryData(sessionQueryOptions()).catch(() => null)
  if (session) return

  // The dialog's own params must not ride along, or signing in would reopen it.
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(location.search as Record<string, unknown>)) {
    if (key !== 'auth' && key !== 'redirect' && typeof value === 'string') params.set(key, value)
  }
  const query = params.toString()

  // Hovering a link preloads the route: only a real navigation explains itself in the dialog.
  if (!preload) authIntent.set({ notice })
  throw redirect({ to: fallback, search: { auth: 'login', redirect: `${location.pathname}${query ? `?${query}` : ''}` } })
}
