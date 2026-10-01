import { useRouter, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

export const AUTH_MODES = ['login', 'signup'] as const
export type AuthMode = (typeof AUTH_MODES)[number]

/** Search params owned by the root route; they open the login or signup dialog over any screen. */
export type AuthSearch = {
  auth?: AuthMode
  /** Same-origin path to go to after signing in (e.g. a private screen that required login). */
  redirect?: string
}

/** Rejects absolute and protocol-relative URLs so `redirect` can't send users to another site. */
export const safeRedirect = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : undefined

export const validateAuthSearch = (search: Record<string, unknown>): AuthSearch => {
  const auth = AUTH_MODES.find((mode) => mode === search.auth)
  return { auth, redirect: auth ? safeRedirect(search.redirect) : undefined }
}

type AuthIntent = {
  /** Shown above the form, e.g. why the user is being asked to sign in. */
  notice?: string
  /** Resumes the action that required authentication once the user signs in. */
  onAuthenticated?: () => void
}

// Kept outside the URL because callbacks can't be serialised; a refresh simply drops the pending action.
let intent: AuthIntent = {}
/** Whether opening pushed a history entry, so closing can go back instead of piling up entries. */
let pushedEntry = false
/** The dialog opens from the URL rather than a Base UI trigger, so focus return is tracked here. */
let opener: HTMLElement | null = null

/**
 * Where focus goes when the dialog closes: the control that opened it, or, when signing in replaced that control,
 * the account button that took its place.
 */
export function getReturnFocus(): HTMLElement | null {
  if (opener?.isConnected) return opener
  return document.querySelector<HTMLElement>('[data-account-trigger]') ?? document.getElementById('conteudo')
}
const listeners = new Set<() => void>()

export const authIntent = {
  get: () => intent,
  set(next: AuthIntent) {
    intent = next
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useAuthDialog() {
  const router = useRouter()

  const open = useCallback(
    (next: AuthIntent = {}) => {
      authIntent.set({ ...authIntent.get(), ...next })
      if (router.state.location.search.auth) return
      opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
      pushedEntry = true
      void router.navigate({ to: '.', search: (prev) => ({ ...prev, auth: 'login' }), resetScroll: false })
    },
    [router],
  )

  const close = useCallback(() => {
    authIntent.set({})
    if (!router.state.location.search.auth) return
    if (pushedEntry) {
      pushedEntry = false
      router.history.back()
      return
    }
    // Opened by a direct link: there is no entry to go back to, so drop the params in place.
    void router.navigate({
      to: '.',
      search: (prev) => ({ ...prev, auth: undefined, redirect: undefined }),
      replace: true,
      resetScroll: false,
    })
  }, [router])

  /** Closes the dialog by replacing the current entry with `href` (the `redirect` target after signing in). */
  const closeTo = useCallback(
    (href: string) => {
      authIntent.set({})
      pushedEntry = false
      void router.navigate({ href, replace: true })
    },
    [router],
  )

  /**
   * Swaps login and signup in place: replacing the entry keeps `redirect` and the pending action, and closing still
   * returns to the screen the dialog was opened from.
   */
  const switchTo = useCallback(
    (mode: AuthMode) => {
      void router.navigate({ to: '.', search: (prev) => ({ ...prev, auth: mode }), replace: true, resetScroll: false })
    },
    [router],
  )

  return { open, close, closeTo, switchTo }
}

/** Closes the dialog after signing in or up, going to `redirect` if any, then resumes the action that required it. */
export function useCompleteAuth() {
  const { redirect } = useSearch({ strict: false })
  const { close, closeTo } = useAuthDialog()

  return useCallback(() => {
    const { onAuthenticated } = authIntent.get()
    if (redirect) closeTo(redirect)
    else close()
    onAuthenticated?.()
  }, [redirect, close, closeTo])
}
