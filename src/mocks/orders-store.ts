import type { CartItemInput, Order } from '@/lib/api/types'
import { isRecord, persisted } from './storage'

export type OrderOutcome = 'confirmed' | 'refused' | 'disconnected'

type StoredOrder = {
  userId: string
  order: Order
  /** The cart lines the order took, to sell them or give them back to the cart. */
  lines: CartItemInput[]
  promoCode?: string
  outcome: OrderOutcome
  /** Epoch ms when the simulated wallet/network answers. */
  settleAt: number
}

const isStoredOrder = (value: unknown): value is StoredOrder =>
  isRecord(value) &&
  typeof value.userId === 'string' &&
  isRecord(value.order) &&
  Array.isArray(value.lines) &&
  (value.outcome === 'confirmed' || value.outcome === 'refused' || value.outcome === 'disconnected') &&
  typeof value.settleAt === 'number'

const store = persisted<Record<string, StoredOrder>>(
  'kurio:mock:orders',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isStoredOrder),
)

const FAILURE_REASONS = {
  refused: 'A carteira recusou a transação. Nenhum valor foi cobrado e seus NFTs voltaram ao carrinho.',
  disconnected: 'A carteira se desconectou antes de assinar a transação. Nenhum valor foi cobrado e seus NFTs voltaram ao carrinho.',
} as const

const transactionId = () => `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`

export const ordersStore = {
  create(entry: StoredOrder) {
    store.write({ ...store.read(), [entry.order.id]: entry })
  },

  /** The order, if `userId` owns it; `forbidden` when it exists but belongs to someone else. */
  get(userId: string, id: string): { order: Order } | { error: 'not-found' | 'forbidden' } {
    const entry = store.read()[id]
    if (!entry) return { error: 'not-found' }
    return entry.userId === userId ? { order: entry.order } : { error: 'forbidden' }
  },

  /** Ids of pending orders whose answer is due by `now`. */
  due(now = Date.now()) {
    return Object.values(store.read())
      .filter((entry) => entry.order.status === 'pending' && entry.settleAt <= now)
      .map((entry) => entry.order.id)
  },

  pending() {
    return Object.values(store.read()).filter((entry) => entry.order.status === 'pending')
  },

  count: () => Object.keys(store.read()).length,

  /** Moves a pending order to its outcome. Returns `undefined` if it was already settled, so effects run once. */
  settle(id: string) {
    const entries = store.read()
    const entry = entries[id]
    if (!entry || entry.order.status !== 'pending') return undefined
    const updatedAt = new Date().toISOString()
    const order: Order =
      entry.outcome === 'confirmed'
        ? { ...entry.order, status: 'confirmed', version: entry.order.version + 1, updatedAt, txId: transactionId() }
        : {
            ...entry.order,
            status: 'refused',
            version: entry.order.version + 1,
            updatedAt,
            failureCode: entry.outcome === 'disconnected' ? 'disconnected' : 'rejected',
            failureReason: FAILURE_REASONS[entry.outcome],
          }
    const settled = { ...entry, order }
    store.write({ ...entries, [id]: settled })
    return settled
  },
}

type IdempotencyRecord = {
  userId: string
  /** The request body the key was first used with; the same key with another body is a conflict. */
  fingerprint: string
  orderId: string
}

const isIdempotencyRecord = (value: unknown): value is IdempotencyRecord =>
  isRecord(value) && typeof value.userId === 'string' && typeof value.fingerprint === 'string' && typeof value.orderId === 'string'

const idempotency = persisted<Record<string, IdempotencyRecord>>(
  'kurio:mock:order-keys',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isIdempotencyRecord),
)

/** `Idempotency-Key` bookkeeping for `POST /orders`: a retried attempt gets the order it already created. */
export const idempotencyKeys = {
  get: (key: string): IdempotencyRecord | undefined => idempotency.read()[key],
  save(key: string, record: IdempotencyRecord) {
    idempotency.write({ ...idempotency.read(), [key]: record })
  },
}
