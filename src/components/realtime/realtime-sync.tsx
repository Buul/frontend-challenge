import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { StatusToast, useStatusToast } from '@/components/ui/status-toast'
import { useIsMobile } from '@/hooks/use-media-query'
import { useSession } from '@/lib/api/auth'
import { applyNftUpdated, applyOrderUpdated, createEventLedger, reconcile } from '@/lib/realtime/apply'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/lib/realtime/events'
import { getSocket } from '@/lib/socket'

// Brief drops (a reconnect, a user switch) are not worth announcing.
const OFFLINE_NOTICE_DELAY_MS = 3000

/**
 * Keeps the Socket.IO connection for the whole app: applies `nft.updated` and `order.updated` to the query cache,
 * reconnects with the new identity when the user changes, and refetches from REST after a reconnection.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient()
  const { user, isPending } = useSession()
  const userId = user?.id
  const isMobile = useIsMobile()
  const { toast, show } = useStatusToast()
  const [offline, setOffline] = useState(false)
  const [ledger] = useState(createEventLedger)

  useEffect(() => {
    let detach: (() => void) | undefined
    let cancelled = false
    let connectedBefore = false
    let offlineTimer: number | undefined

    const onConnect = () => {
      window.clearTimeout(offlineTimer)
      offlineTimer = undefined
      setOffline(false)
      if (connectedBefore) reconcile(queryClient)
      connectedBefore = true
    }
    // Counted from the first drop: every failed retry fires again and must not push the notice back.
    const onDisconnect = () => {
      offlineTimer ??= window.setTimeout(() => setOffline(true), OFFLINE_NOTICE_DELAY_MS)
    }
    const onNftUpdated = (event: NftUpdatedEvent) => {
      if (!ledger.accept(event)) return
      const notice = applyNftUpdated(queryClient, event)
      if (notice) show(notice)
    }
    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      if (!ledger.accept(event)) return
      const notice = applyOrderUpdated(queryClient, event)
      if (notice) show(notice)
    }

    void getSocket().then((socket) => {
      if (cancelled) return
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('connect_error', onDisconnect)
      socket.on('nft.updated', onNftUpdated)
      socket.on('order.updated', onOrderUpdated)
      socket.connect()
      detach = () => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('connect_error', onDisconnect)
        socket.off('nft.updated', onNftUpdated)
        socket.off('order.updated', onOrderUpdated)
        socket.disconnect()
      }
    })

    return () => {
      cancelled = true
      window.clearTimeout(offlineTimer)
      detach?.()
    }
  }, [queryClient, ledger, show])

  // The server binds a socket to the session of its handshake, so a new identity needs a new handshake.
  const boundUser = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (isPending) return
    if (boundUser.current === undefined) {
      boundUser.current = userId ?? ''
      return
    }
    if (boundUser.current === (userId ?? '')) return
    boundUser.current = userId ?? ''
    void getSocket().then((socket) => {
      if (socket.active) socket.disconnect().connect()
    })
  }, [userId, isPending])

  return (
    <>
      <StatusToast toast={toast} className={isMobile ? 'bottom-28' : 'bottom-6'} />
      <div role="status" className="pointer-events-none fixed bottom-6 left-6 z-50">
        {offline && (
          <p className="rounded-full border border-border bg-surface-raised px-4 py-2 text-xs leading-4 text-muted-foreground shadow-lg">
            Atualizações em tempo real indisponíveis. Tentando reconectar…
          </p>
        )}
      </div>
    </>
  )
}
