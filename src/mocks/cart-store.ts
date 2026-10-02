import type { Cart, CartItem, CartItemInput } from '@/lib/api/types'
import { addEth, multiplyEth, percentEth, subtractEth, type EthAmount } from '@/lib/eth'
import { nftDetails } from './data'
import { isRecord, persisted } from './storage'

type StoredLine = CartItemInput
type StoredCart = { items: StoredLine[]; promoCode?: string }

/** Whose cart: a user id, or `GUEST_CART` for the visitor browsing this browser without an account. */
export type CartOwner = string
export const GUEST_CART: CartOwner = 'guest'

const NETWORK_FEE: EthAmount = '0.016'

type Promo = { percent: number; expiresAt?: string }

const PROMO_CODES: Record<string, Promo> = {
  KURIO10: { percent: 10 },
  // Kept to exercise the "expired code" path.
  LANCAMENTO20: { percent: 20, expiresAt: '2026-01-31T23:59:59Z' },
}

const activePromo = (code: string | undefined) => {
  const promo = code ? PROMO_CODES[code] : undefined
  return promo && (!promo.expiresAt || Date.parse(promo.expiresAt) > Date.now()) ? promo : undefined
}

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

const carts = persisted<Record<CartOwner, StoredCart>>(
  'kurio:mock:carts',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isStoredCart),
)

const read = (owner: CartOwner): StoredCart => carts.read()[owner] ?? { items: [] }
const write = (owner: CartOwner, cart: StoredCart) => carts.write({ ...carts.read(), [owner]: cart })

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

function snapshot(owner: CartOwner): Cart {
  const stored = read(owner)
  const items = stored.items.map(hydrateLine).filter((item): item is CartItem => item !== undefined)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = addEth('0', ...items.map((item) => item.lineTotal))
  const promo = activePromo(stored.promoCode)
  const discount = promo ? percentEth(subtotal, promo.percent) : '0'
  const networkFee = itemCount > 0 ? NETWORK_FEE : '0'
  const total = addEth(subtractEth(subtotal, discount), networkFee)
  const promoCode = promo ? stored.promoCode : undefined
  // Drop vanished NFTs and a promo that no longer applies so the next write stays in sync.
  write(owner, { items: items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })), promoCode })
  return { items, itemCount, subtotal, discount, networkFee, total, promoCode }
}

/** Adds lines to a stored cart, summing quantities of the same NFT and edition. */
function mergeLines(items: StoredLine[], lines: StoredLine[]) {
  const merged = [...items]
  for (const line of lines) {
    const current = merged.findIndex((item) => lineKey(item.nftId, item.editionId) === lineKey(line.nftId, line.editionId))
    if (current === -1) merged.push(line)
    else merged[current] = { ...merged[current], quantity: merged[current].quantity + line.quantity }
  }
  return merged
}

export const cartStore = {
  get: snapshot,

  add(owner: CartOwner, input: CartItemInput) {
    const nft = nftDetails.get(input.nftId)
    const edition = nft?.editions.find((item) => item.id === input.editionId)
    if (!nft) return { error: 'not-found' as const }
    if (!edition || edition.available === 0) return { error: 'sold-out' as const }

    const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
    const stored = read(owner)
    const current = stored.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    const nextQuantity = Math.min((current?.quantity ?? 0) + input.quantity, maxQuantity)
    if (current && nextQuantity === current.quantity) return { error: 'limit' as const, max: maxQuantity }

    write(owner, {
      ...stored,
      items: current
        ? stored.items.map((item) => (lineKey(item.nftId, item.editionId) === lineKey(input.nftId, input.editionId) ? { ...item, quantity: nextQuantity } : item))
        : [...stored.items, { nftId: input.nftId, editionId: input.editionId, quantity: nextQuantity }],
    })
    return { cart: snapshot(owner) }
  },

  setQuantity(owner: CartOwner, input: CartItemInput) {
    const stored = read(owner)
    const current = stored.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    if (!current) return { error: 'not-found' as const }

    if (input.quantity === 0) {
      write(owner, { ...stored, items: stored.items.filter((item) => lineKey(item.nftId, item.editionId) !== lineKey(input.nftId, input.editionId)) })
      return { cart: snapshot(owner) }
    }

    const nft = nftDetails.get(input.nftId)
    const edition = nft?.editions.find((item) => item.id === input.editionId)
    if (!nft || !edition || edition.available === 0) return { error: 'sold-out' as const }
    const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
    if (input.quantity > maxQuantity) return { error: 'limit' as const, max: maxQuantity }

    write(owner, {
      ...stored,
      items: stored.items.map((item) => (lineKey(item.nftId, item.editionId) === lineKey(input.nftId, input.editionId) ? { ...item, quantity: input.quantity } : item)),
    })
    return { cart: snapshot(owner) }
  },

  applyPromo(owner: CartOwner, code: string) {
    const normalized = code.trim().toUpperCase()
    if (!PROMO_CODES[normalized]) return { error: 'invalid' as const }
    if (!activePromo(normalized)) return { error: 'expired' as const }
    write(owner, { ...read(owner), promoCode: normalized })
    return { cart: snapshot(owner) }
  },

  /** Returns the current cart and empties it. An empty cart is left untouched. */
  take(owner: CartOwner) {
    const cart = snapshot(owner)
    if (cart.itemCount === 0) return { error: 'empty' as const }
    write(owner, { items: [] })
    return { cart }
  },

  /** Gives back the lines of a refused order, merged with whatever was added to the cart meanwhile. */
  restore(owner: CartOwner, lines: StoredLine[], promoCode?: string) {
    const stored = read(owner)
    write(owner, { items: mergeLines(stored.items, lines), promoCode: stored.promoCode ?? promoCode })
    // Hydrating clamps quantities to the current supply and drops lines that sold out meanwhile.
    return snapshot(owner)
  },

  /**
   * Moves the visitor's cart into the account that just signed in, so nothing picked before logging in is lost.
   * The visitor cart is emptied: after logout the browser starts a fresh visitor cart.
   */
  adoptGuestCart(userId: string) {
    const guest = read(GUEST_CART)
    if (guest.items.length === 0) return
    const stored = read(userId)
    write(userId, { items: mergeLines(stored.items, guest.items), promoCode: stored.promoCode ?? guest.promoCode })
    write(GUEST_CART, { items: [] })
    // Clamps the merged quantities to supply and per-order limits.
    snapshot(userId)
  },
}
