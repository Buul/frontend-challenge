import type { CartItemInput, Order } from '@/lib/api/types'
import { isRecord, persisted } from './storage'

export type OrderOutcome = 'confirmed' | 'refused'

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
  (value.outcome === 'confirmed' || value.outcome === 'refused') &&
  typeof value.settleAt === 'number'

const store = persisted<Record<string, StoredOrder>>(
  'kurio:mock:orders',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isStoredOrder),
)

const transactionId = () => `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`

export const ordersStore = {
  create(entry: StoredOrder) {
    store.write({ ...store.read(), [entry.order.id]: entry })
  },

  /** Only the owner sees an order; for anyone else it does not exist. */
  get(userId: string, id: string) {
    const entry = store.read()[id]
    return entry?.userId === userId ? entry.order : undefined
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
            failureReason: 'A carteira recusou a transação. Nenhum valor foi cobrado e seus NFTs voltaram ao carrinho.',
          }
    const settled = { ...entry, order }
    store.write({ ...entries, [id]: settled })
    return settled
  },
}
