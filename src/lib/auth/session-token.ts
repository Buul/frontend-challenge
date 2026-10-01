/**
 * The bearer token lives in `localStorage` so the session survives refreshes and is shared across tabs.
 * Trade-off: unlike an httpOnly cookie it is readable by scripts; acceptable for this mock-backed demo.
 */
export const SESSION_TOKEN_KEY = 'kurio:session-token'

export const sessionToken = {
  get: () => localStorage.getItem(SESSION_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(SESSION_TOKEN_KEY),
}

type ExpiredListener = () => void
const expiredListeners = new Set<ExpiredListener>()

/** Called by the HTTP layer when the API rejects the current token. */
export function notifySessionExpired() {
  expiredListeners.forEach((listener) => listener())
}

export function onSessionExpired(listener: ExpiredListener) {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}
