import type { Socket } from 'socket.io-client'
import { sessionToken } from '@/lib/auth/session-token'
import type { ClientToServerEvents, RealtimeAuth, ServerToClientEvents } from '@/lib/realtime/events'

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? window.location.origin

let socket: Promise<RealtimeSocket> | undefined

/**
 * `socket.io-client` is loaded on first use, never at startup: `engine.io-client` captures `globalThis.WebSocket`
 * when its module is evaluated, which must happen after MSW has patched it. It also keeps the client out of the first bundle.
 */
export function getSocket(): Promise<RealtimeSocket> {
  socket ??= import('socket.io-client').then(({ io }) =>
    io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: false,
      // WebSocket only: long-polling would go through HTTP, where the mocked realtime server does not live.
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      // Read on every (re)connection, so a reconnect always speaks for the current session.
      auth: (callback) => {
        const token = sessionToken.get()
        callback((token ? { token } : {}) satisfies RealtimeAuth)
      },
    }),
  )
  return socket
}
