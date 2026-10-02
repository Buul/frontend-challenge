import type { NftDetail, Order } from '@/lib/api/types'
import { normalizeEth, type EthAmount } from '@/lib/eth'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/lib/realtime/events'
import { SOCKET_URL } from '@/lib/socket'
import { sessionForToken } from './auth'
import { cartStore } from './cart-store'
import { nfts } from './data'
import { marketStore, type MarketChange } from './market-store'
import { ordersStore, type OrderOutcome } from './orders-store'
import { isScenarioActive, orderSettleDelay } from './scenarios'
import { createSocketIoServer, type SocketIoPeer } from './socket-io'

type AnyEvent = NftUpdatedEvent | OrderUpdatedEvent

// MSW strips the `/socket.io/` path from Socket.IO clients before matching, so the link is the server's origin.
const socketUrl = new URL('/', SOCKET_URL)
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'

const server = createSocketIoServer(socketUrl.href)

export const realtimeHandlers = [server.handler]

/** The user behind a socket, checked on every delivery: a logged-out or expired token stops receiving private events. */
const userOf = (peer: SocketIoPeer) => (typeof peer.auth.token === 'string' ? sessionForToken(peer.auth.token)?.user.id : undefined)

// Recent events, so tests and DevTools can redeliver one as a duplicate.
const recent = new Map<string, AnyEvent>()
const RECENT_LIMIT = 100

function deliver(event: AnyEvent) {
  recent.set(event.id, event)
  if (recent.size > RECENT_LIMIT) recent.delete(recent.keys().next().value!)
  const copies = event.type === 'nft.updated' && isScenarioActive('realtime-duplicates') ? 2 : 1
  for (const peer of server.peers) {
    if (event.type === 'order.updated' && userOf(peer) !== event.data.userId) continue
    for (let copy = 0; copy < copies; copy++) peer.emit(event.type, event)
  }
}

const envelope = <Event extends AnyEvent>(type: Event['type'], resource: Event['resource'], version: number) => ({
  id: crypto.randomUUID(),
  type,
  resource,
  version,
  occurredAt: new Date().toISOString(),
})

export function publishNftUpdated(nft: NftDetail) {
  const event: NftUpdatedEvent = {
    ...envelope<NftUpdatedEvent>('nft.updated', { type: 'nft', id: nft.id }, nft.version),
    data: {
      price: nft.price,
      previousPrice: nft.previousPrice,
      editions: nft.editions.map(({ id, available }) => ({ id, available })),
      updatedAt: nft.updatedAt,
    },
  }
  deliver(event)
  return event
}

function publishOrderUpdated(userId: string, order: Order) {
  const event: OrderUpdatedEvent = { ...envelope<OrderUpdatedEvent>('order.updated', { type: 'order', id: order.id }, order.version), data: { userId, order } }
  deliver(event)
  return event
}

/** Settles an order once: a confirmation sells its units, a refusal gives the items back to the cart. */
function settleOrder(id: string) {
  const settled = ordersStore.settle(id)
  if (!settled) return
  if (settled.order.status === 'confirmed') marketStore.sell(settled.lines).forEach(publishNftUpdated)
  else cartStore.restore(settled.userId, settled.lines, settled.promoCode)
  publishOrderUpdated(settled.userId, settled.order)
}

/** Answers every order whose simulated wallet response is due; REST reads call it so a reload never sees a stale `pending`. */
export function settleDueOrders() {
  ordersStore.due().forEach(settleOrder)
}

function scheduleSettlement(id: string, settleAt: number) {
  window.setTimeout(() => settleOrder(id), Math.max(0, settleAt - Date.now()))
}

export function placeOrder(entry: { userId: string; order: Order; lines: Parameters<typeof ordersStore.create>[0]['lines']; promoCode?: string }) {
  const outcome: OrderOutcome = isScenarioActive('payment-refused') ? 'refused' : 'confirmed'
  const settleAt = Date.now() + orderSettleDelay()
  ordersStore.create({ ...entry, outcome, settleAt })
  scheduleSettlement(entry.order.id, settleAt)
}

// Orders left pending by a reload resume their countdown.
ordersStore.pending().forEach((entry) => scheduleSettlement(entry.order.id, entry.settleAt))

server.onConnect(() => settleDueOrders())
if (isScenarioActive('realtime-offline')) server.setAccepting(false)

if (isScenarioActive('market-live')) {
  window.setInterval(() => {
    const nft = nfts[Math.floor(Math.random() * 9)]
    const factor = 0.9 + Math.random() * 0.2
    const price = normalizeEth((Number(nft.price) * factor).toFixed(2))
    const updated = marketStore.update(nft.id, { price: price === '0' ? '0.01' : price })
    if (updated) publishNftUpdated(updated)
  }, 8000)
}

/**
 * Controls for E2E tests and manual checks in DevTools (`window.kurioMock.realtime`).
 * They change the mock server's state; the app only ever hears about it through its Socket.IO client.
 */
export const realtimeControls = {
  /** Sockets that completed the Socket.IO handshake. */
  connections: () => server.peers.size,
  /** Changes an NFT's price and/or supply on the server and pushes `nft.updated`. */
  updateNft(id: string, change: { price?: EthAmount; available?: MarketChange['available'] }) {
    const nft = marketStore.update(id, change)
    if (!nft) throw new Error(`Unknown NFT ${id}`)
    return publishNftUpdated(nft)
  },
  /** Changes the server state without telling anyone, as if the event was lost while the client was offline. */
  updateNftSilently(id: string, change: { price?: EthAmount; available?: MarketChange['available'] }) {
    if (!marketStore.update(id, change)) throw new Error(`Unknown NFT ${id}`)
  },
  /** Redelivers a past event unchanged (same id and version), as a network duplicate would. */
  redeliver(eventId: string) {
    const event = recent.get(eventId)
    if (!event) throw new Error(`Unknown event ${eventId}`)
    deliver(event)
  },
  /** Delivers an arbitrary event, e.g. an old version arriving late. */
  deliver: (event: AnyEvent) => deliver(event),
  /** Drops every connection; clients reconnect on their own. */
  disconnectAll: () => [...server.peers].forEach((peer) => peer.disconnect()),
  /** Offline drops connections and refuses new ones until set back online. */
  setOnline: (online: boolean) => server.setAccepting(online),
  /** Answers pending orders now instead of waiting for the settle delay. */
  settleOrders: () => ordersStore.pending().forEach((entry) => settleOrder(entry.order.id)),
}
