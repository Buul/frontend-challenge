import type { Cart, CartItem, CartItemInput } from '@/lib/api/types'
import { addEth, multiplyEth, percentEth, subtractEth, type EthAmount } from '@/lib/eth'
import { nftDetails } from './data'
import { isRecord, persisted } from './storage'

type StoredLine = CartItemInput
type StoredCart = { items: StoredLine[]; promoCode?: string }

const NETWORK_FEE: EthAmount = '0.016'
const PROMO_CODES: Record<string, number> = { KURIO10: 10 }

const isStoredLine = (value: unknown): value is StoredLine =>
  isRecord(value) &&
  typeof value.nftId === 'string' &&
  typeof value.editionId === 'string' &&
  Number.isInteger(value.quantity) &&
  (value.quantity as number) > 0

const isStoredCart = (value: unknown): value is StoredCart =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  value.items.every(isStoredLine) &&
  (value.promoCode === undefined || typeof value.promoCode === 'string')

const store = persisted<StoredCart>('kurio:mock:cart', () => ({ items: [] }), isStoredCart)

const lineKey = (nftId: string, editionId: string) => `${nftId}:${editionId}`

function hydrateLine(line: StoredLine): CartItem | undefined {
  const nft = nftDetails.get(line.nftId)
  const edition = nft?.editions.find((item) => item.id === line.editionId)
  if (!nft || !edition || edition.available === 0) return undefined
  const maxQuantity = Math.max(1, Math.min(edition.available, edition.maxPerOrder))
  const quantity = Math.min(line.quantity, maxQuantity)
  return {
    nftId: nft.id,
    editionId: edition.id,
    quantity,
    name: nft.name,
    image: nft.image,
    tokenId: nft.tokenId,
    editionLabel: edition.label,
    unitPrice: nft.price,
    lineTotal: multiplyEth(nft.price, quantity),
    available: edition.available,
    maxPerOrder: edition.maxPerOrder,
  }
}

function snapshot(): Cart {
  const stored = store.read()
  const items = stored.items.map(hydrateLine).filter((item): item is CartItem => item !== undefined)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = addEth('0', ...items.map((item) => item.lineTotal))
  const percent = stored.promoCode ? PROMO_CODES[stored.promoCode] : undefined
  const discount = percent ? percentEth(subtotal, percent) : '0'
  const networkFee = itemCount > 0 ? NETWORK_FEE : '0'
  const total = addEth(subtractEth(subtotal, discount), networkFee)
  const promoCode = percent ? stored.promoCode : undefined
  // Drop vanished NFTs and a promo that no longer applies so the next write stays in sync.
  store.write({ items: items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })), promoCode })
  return { items, itemCount, subtotal, discount, networkFee, total, promoCode }
}

export const cartStore = {
  get: snapshot,

  add(input: CartItemInput) {
    const nft = nftDetails.get(input.nftId)
    const edition = nft?.editions.find((item) => item.id === input.editionId)
    if (!nft) return { error: 'not-found' as const }
    if (!edition || edition.available === 0) return { error: 'sold-out' as const }

    const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
    const stored = store.read()
    const current = stored.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    const nextQuantity = Math.min((current?.quantity ?? 0) + input.quantity, maxQuantity)
    if (current && nextQuantity === current.quantity) return { error: 'limit' as const, max: maxQuantity }

    store.write({
      ...stored,
      items: current
        ? stored.items.map((item) => (lineKey(item.nftId, item.editionId) === lineKey(input.nftId, input.editionId) ? { ...item, quantity: nextQuantity } : item))
        : [...stored.items, { nftId: input.nftId, editionId: input.editionId, quantity: nextQuantity }],
    })
    return { cart: snapshot() }
  },

  setQuantity(input: CartItemInput) {
    const stored = store.read()
    const current = stored.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    if (!current) return { error: 'not-found' as const }

    if (input.quantity === 0) {
      store.write({ ...stored, items: stored.items.filter((item) => lineKey(item.nftId, item.editionId) !== lineKey(input.nftId, input.editionId)) })
      return { cart: snapshot() }
    }

    const nft = nftDetails.get(input.nftId)
    const edition = nft?.editions.find((item) => item.id === input.editionId)
    if (!nft || !edition || edition.available === 0) return { error: 'sold-out' as const }
    const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
    if (input.quantity > maxQuantity) return { error: 'limit' as const, max: maxQuantity }

    store.write({
      ...stored,
      items: stored.items.map((item) => (lineKey(item.nftId, item.editionId) === lineKey(input.nftId, input.editionId) ? { ...item, quantity: input.quantity } : item)),
    })
    return { cart: snapshot() }
  },

  applyPromo(code: string) {
    const normalized = code.trim().toUpperCase()
    if (!PROMO_CODES[normalized]) return { error: 'invalid' as const }
    store.write({ ...store.read(), promoCode: normalized })
    return { cart: snapshot() }
  },

  /** Returns the current cart and empties it. An empty cart is left untouched. */
  take() {
    const cart = snapshot()
    if (cart.itemCount === 0) return { error: 'empty' as const }
    store.write({ items: [] })
    return { cart }
  },
}
