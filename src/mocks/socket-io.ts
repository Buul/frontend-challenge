import { decodePacket, encodePacket, type Packet as EnginePacket } from 'engine.io-parser'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { Decoder, Encoder, PacketType, type Packet as SocketPacket } from 'socket.io-parser'
import { isRecord } from './storage'

/**
 * The server side of the Socket.IO protocol (Engine.IO v4 over WebSocket, default namespace, JSON events)
 * on top of MSW's WebSocket interception, so the app's real `socket.io-client` talks to the mocked backend.
 *
 * `@mswjs/socket.io-binding` targets MSW 2 and fakes the handshake without reading the client's `auth`
 * or sending heartbeats, so this module plays the server with the official `engine.io-parser` and
 * `socket.io-parser` instead.
 */

type WebSocketClient = WebSocketHandlerConnection['client']

export type SocketIoPeer = {
  sid: string
  /** The `auth` payload of the client's CONNECT packet. */
  auth: Record<string, unknown>
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
}

// Same defaults as a Socket.IO server: the client gives up after `pingInterval + pingTimeout` without a ping.
const PING_INTERVAL_MS = 25_000
const PING_TIMEOUT_MS = 20_000

export function createSocketIoServer(url: string) {
  const link = ws.link(url)
  const peers = new Set<SocketIoPeer>()
  const connectListeners = new Set<(peer: SocketIoPeer) => void>()
  let accepting = true

  const handler = link.addEventListener('connection', ({ client }) => {
    // MSW turns an exception here into a connection error (`error` + close 1011), like a server that refuses
    // the handshake; the client then keeps retrying. A plain close would leave it waiting for the handshake.
    if (!accepting) throw new Error('[kurio mock] Realtime offline: connection refused.')
    serve(client)
  })

  function serve(client: WebSocketClient) {
    const sid = crypto.randomUUID()
    const encoder = new Encoder()
    const decoder = new Decoder()
    let peer: SocketIoPeer | undefined

    const sendEngine = (packet: EnginePacket) => encodePacket(packet, false, (data) => client.send(data))
    const sendSocket = (packet: SocketPacket) => {
      for (const data of encoder.encode(packet)) sendEngine({ type: 'message', data })
    }
    const heartbeat = window.setInterval(() => sendEngine({ type: 'ping' }), PING_INTERVAL_MS)

    decoder.on('decoded', (packet: SocketPacket) => {
      if (packet.type === PacketType.CONNECT && !peer) {
        peer = {
          sid,
          auth: isRecord(packet.data) ? packet.data : {},
          emit: (event, ...args) => sendSocket({ type: PacketType.EVENT, nsp: '/', data: [event, ...args] }),
          disconnect: () => client.close(),
        }
        sendSocket({ type: PacketType.CONNECT, nsp: '/', data: { sid } })
        peers.add(peer)
        connectListeners.forEach((listener) => listener(peer!))
      } else if (packet.type === PacketType.DISCONNECT) {
        client.close()
      }
    })

    client.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return
      const packet = decodePacket(event.data)
      if (packet.type === 'message' && typeof packet.data === 'string') decoder.add(packet.data)
      else if (packet.type === 'close') client.close()
      // `pong` answers our heartbeat; nothing else to do.
    })

    client.addEventListener('close', () => {
      window.clearInterval(heartbeat)
      decoder.destroy()
      if (peer) peers.delete(peer)
    })

    sendEngine({
      type: 'open',
      data: JSON.stringify({ sid, upgrades: [], pingInterval: PING_INTERVAL_MS, pingTimeout: PING_TIMEOUT_MS, maxPayload: 1_000_000 }),
    })
  }

  return {
    handler,
    peers,
    onConnect(listener: (peer: SocketIoPeer) => void) {
      connectListeners.add(listener)
    },
    /** While offline, open connections are dropped and new ones refused, so clients keep retrying. */
    setAccepting(value: boolean) {
      accepting = value
      if (!value) [...peers].forEach((peer) => peer.disconnect())
    },
    get accepting() {
      return accepting
    },
  }
}
