import type { EthAmount } from '@/lib/eth'
import type { NftEdition, Order } from '@/lib/api/types'

/**
 * Envelope shared by every realtime event.
 * - `id` is unique per emission of a change; a duplicate delivery repeats the same `id`.
 * - `version` is the version of `resource` after the change; it only grows, so a client
 *   that already holds that version (or a newer one, e.g. from REST) must ignore the event.
 */
export type RealtimeEvent<Type extends string, Resource extends string, Data> = {
  id: string
  type: Type
  resource: { type: Resource; id: string }
  version: number
  occurredAt: string
  data: Data
}

export type NftUpdatedEvent = RealtimeEvent<
  'nft.updated',
  'nft',
  {
    price: EthAmount
    previousPrice?: EthAmount
    editions: Pick<NftEdition, 'id' | 'available'>[]
    updatedAt: string
  }
>

/** Only delivered to the sockets of the order's owner; `userId` lets the client drop events meant for a previous session. */
export type OrderUpdatedEvent = RealtimeEvent<'order.updated', 'order', { userId: string; order: Order }>

export type ServerToClientEvents = {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export type ClientToServerEvents = Record<string, never>

/** Sent in the Socket.IO handshake (`auth`); visitors connect without a token and only receive public events. */
export type RealtimeAuth = { token?: string }
