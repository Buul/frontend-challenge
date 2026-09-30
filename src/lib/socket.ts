import { io, type Socket } from 'socket.io-client'

type ServerToClientEvents = Record<string, never>
type ClientToServerEvents = Record<string, never>

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: RealtimeSocket | undefined

export function getSocket(): RealtimeSocket {
  socket ??= io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket', 'polling'],
  })
  return socket
}
