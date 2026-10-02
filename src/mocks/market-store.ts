import type { CartItemInput, Nft } from '@/lib/api/types'
import { compareEth, isEthAmount, type EthAmount } from '@/lib/eth'
import { nftDetails, nfts } from './data'
import { isRecord, persisted } from './storage'

/** What changed on an NFT since the fixtures: the mock server's live price and supply. */
type MarketState = {
  version: number
  updatedAt: string
  price: EthAmount
  previousPrice?: EthAmount
  available: Record<string, number>
}

export type MarketChange = {
  price?: EthAmount
  /** Units left per edition id; editions left out keep their supply. */
  available?: Record<string, number>
}

const isMarketState = (value: unknown): value is MarketState =>
  isRecord(value) &&
  Number.isInteger(value.version) &&
  typeof value.updatedAt === 'string' &&
  isEthAmount(value.price) &&
  (value.previousPrice === undefined || isEthAmount(value.previousPrice)) &&
  isRecord(value.available)

const store = persisted<Record<string, MarketState>>(
  'kurio:mock:market',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isMarketState),
)

const nftById = new Map(nfts.map((nft) => [nft.id, nft]))

/** The list entry and the detail are separate objects (the detail spreads the list entry), so both are patched. */
function apply(id: string, state: MarketState) {
  for (const target of [nftById.get(id), nftDetails.get(id)]) {
    if (!target) continue
    target.version = state.version
    target.updatedAt = state.updatedAt
    target.price = state.price
    target.previousPrice = state.previousPrice
    target.editions = target.editions.map((edition) => ({ ...edition, available: state.available[edition.id] ?? edition.available }))
  }
}

for (const [id, state] of Object.entries(store.read())) apply(id, state)

function stateOf(nft: Nft): MarketState {
  return {
    version: nft.version,
    updatedAt: nft.updatedAt,
    price: nft.price,
    previousPrice: nft.previousPrice,
    available: Object.fromEntries(nft.editions.map((edition) => [edition.id, edition.available])),
  }
}

function commit(id: string, next: MarketState) {
  store.write({ ...store.read(), [id]: next })
  apply(id, next)
  return nftDetails.get(id)!
}

export const marketStore = {
  /** Applies a price and/or supply change, bumping the NFT's version. Returns the updated NFT, or `undefined` if unknown. */
  update(id: string, change: MarketChange) {
    const nft = nftDetails.get(id)
    if (!nft) return undefined
    const current = stateOf(nft)
    const price = change.price ?? current.price
    const priceChanged = compareEth(price, current.price) !== 0
    return commit(id, {
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      price,
      // A price drop keeps the old price on display (struck through); a rise clears it.
      previousPrice: priceChanged ? (compareEth(price, current.price) < 0 ? current.price : undefined) : current.previousPrice,
      available: { ...current.available, ...change.available },
    })
  },

  /** Removes sold units from each edition. Returns the NFTs whose supply changed. */
  sell(lines: CartItemInput[]) {
    const sold = new Map<string, Record<string, number>>()
    for (const { nftId, editionId, quantity } of lines) {
      const nft = nftDetails.get(nftId)
      const edition = nft?.editions.find((item) => item.id === editionId)
      // Open editions have no fixed supply.
      if (!nft || !edition || edition.supply === null) continue
      const available = { ...sold.get(nftId) }
      available[editionId] = Math.max(0, (available[editionId] ?? edition.available) - quantity)
      sold.set(nftId, available)
    }
    return [...sold].flatMap(([id, available]) => marketStore.update(id, { available }) ?? [])
  },
}
