import type { Server as HttpServer } from 'node:http'
import type { Http2SecureServer } from 'node:http2'
import { Server } from 'socket.io'
import type { Plugin } from 'vite'

export function attachRealtime(httpServer: HttpServer | Http2SecureServer) {
  const io = new Server(httpServer as HttpServer, {
    path: '/socket.io',
    cors: { origin: '*' },
  })

  httpServer.on('close', () => io.close())

  return io
}

export function realtimePlugin(): Plugin {
  return {
    name: 'socket-io-realtime',
    configureServer(server) {
      if (server.httpServer) attachRealtime(server.httpServer)
    },
    configurePreviewServer(server) {
      attachRealtime(server.httpServer)
    },
  }
}
