import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { clearPrivateData, endSession, resetCart, sessionKeys, useSession } from '@/lib/api/auth'
import { useAuthDialog } from '@/lib/auth/auth-dialog'
import { onSessionExpired, SESSION_TOKEN_KEY } from '@/lib/auth/session-token'

export const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'

/** Ends the session when the API rejects the token or `expiresAt` passes, and follows logins/logouts made in other tabs. */
export function SessionSync() {
  const queryClient = useQueryClient()
  const { open } = useAuthDialog()
  const { data: session } = useSession()
  const expiresAt = session?.expiresAt

  const expire = useCallback(() => {
    void endSession(queryClient, { expired: true })
    open({ notice: SESSION_EXPIRED_NOTICE })
  }, [queryClient, open])

  useEffect(() => onSessionExpired(expire), [expire])

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setTimeout(
      expire,
      Math.min(Math.max(Date.parse(expiresAt) - Date.now(), 0), 2 ** 31 - 1),
    )
    return () => window.clearTimeout(timer)
  }, [expiresAt, expire])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_TOKEN_KEY && event.key !== null) return
      void clearPrivateData(queryClient).then(() => {
        void resetCart(queryClient)
        return queryClient.invalidateQueries({ queryKey: sessionKeys.current })
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  return null
}
