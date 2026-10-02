import type { QueryClient } from '@tanstack/react-query'
import { currentUserId } from '@/lib/api/auth'
import { cartKeys } from '@/lib/api/cart'
import { nftKeys } from '@/lib/api/nfts'
import { orderKeys } from '@/lib/api/orders'
import type { Cart, Nft, NftPage, Order } from '@/lib/api/types'
import { compareEth } from '@/lib/eth'
import { formatEth } from '@/lib/format'
import type { NftUpdatedEvent, OrderUpdatedEvent } from './events'

/** What an applied event means for the collector, when it is worth telling them. */
export type RealtimeNotice = string | undefined

/**
 * Remembers which events were applied and the newest version seen per resource, so a duplicate
 * delivery (same `id`) or a late, older event (lower `version`) never re-applies or rolls back a change.
 * The cached data's own `version` is checked too, which covers REST responses newer than an event.
 */
export function createEventLedger(limit = 500) {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return {
    /** True when the event is new and newer than anything seen for its resource; records it if so. */
    accept(event: { id: string; version: number; resource: { type: string; id: string } }) {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      if (seen.size > limit) seen.delete(seen.values().next().value!)
      const key = `${event.resource.type}:${event.resource.id}`
      if (event.version <= (versions.get(key) ?? 0)) return false
      versions.set(key, event.version)
      return true
    },
    clear() {
      seen.clear()
      versions.clear()
    },
  }
}

function patchNft<T extends Nft>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.resource.id || nft.version >= event.version) return nft
  const available = new Map(event.data.editions.map((edition) => [edition.id, edition.available]))
  return {
    ...nft,
    version: event.version,
    updatedAt: event.data.updatedAt,
    price: event.data.price,
    previousPrice: event.data.previousPrice,
    editions: nft.editions.map((edition) => ({ ...edition, available: available.get(edition.id) ?? edition.available })),
  }
}

const isWatched = (queryClient: QueryClient, queryKey: readonly unknown[]) =>
  (queryClient.getQueryCache().find({ queryKey, exact: true })?.getObserversCount() ?? 0) > 0

/** Reflects a price/supply change in the catalog, the detail and the cart. */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): RealtimeNotice {
  const id = event.resource.id
  const detailKey = nftKeys.detail(id)
  const before = queryClient.getQueryData<Nft>(detailKey)
  const cart = queryClient.getQueryData<Cart>(cartKeys.current)

  queryClient.setQueriesData<NftPage>({ queryKey: [...nftKeys.all, 'list'] }, (page) =>
    page && { ...page, data: page.data.map((nft) => patchNft(nft, event)) },
  )
  queryClient.setQueriesData<Nft[]>({ queryKey: [...nftKeys.all, 'related'] }, (list) => list?.map((nft) => patchNft(nft, event)))
  queryClient.setQueryData<Nft[]>(nftKeys.suggested(), (list) => list?.map((nft) => patchNft(nft, event)))
  queryClient.setQueryData(detailKey, (nft: Nft | undefined) => nft && patchNft(nft, event))
  // The featured entries carry no version; refetching them is cheap and always consistent.
  void queryClient.invalidateQueries({ queryKey: nftKeys.featured() })

  // Cart totals, discounts and clamped quantities are the server's to compute.
  const inCart = cart?.items.filter((item) => item.nftId === id) ?? []
  if (inCart.length > 0) void queryClient.invalidateQueries({ queryKey: cartKeys.current })

  const name = inCart[0]?.name ?? before?.name
  const oldPrice = inCart[0]?.unitPrice ?? before?.price
  if (!name) return undefined
  const priceChanged = oldPrice !== undefined && compareEth(oldPrice, event.data.price) !== 0
  const soldOut = inCart.filter((item) => event.data.editions.find((edition) => edition.id === item.editionId)?.available === 0)

  if (inCart.length > 0) {
    if (soldOut.length > 0) return `${name} (edição ${soldOut[0].editionLabel}) esgotou e saiu do carrinho.`
    if (priceChanged) return `O preço de ${name} no carrinho mudou para ${formatEth(event.data.price)}.`
    const reduced = inCart.find((item) => (event.data.editions.find((edition) => edition.id === item.editionId)?.available ?? Infinity) < item.quantity)
    return reduced ? `A quantidade de ${name} no carrinho foi ajustada ao estoque disponível.` : undefined
  }
  if (priceChanged && isWatched(queryClient, detailKey)) return `O preço de ${name} mudou para ${formatEth(event.data.price)}.`
  return undefined
}

/** Moves the buyer's cached order to its new state; events for anyone else (e.g. a previous session) are dropped. */
export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent): RealtimeNotice {
  const userId = currentUserId(queryClient)
  if (!userId || event.data.userId !== userId) return undefined

  const key = orderKeys.detail(userId, event.resource.id)
  const watched = isWatched(queryClient, key)
  let applied = false
  queryClient.setQueryData<Order>(key, (order) => {
    if (order && order.version >= event.version) return order
    applied = true
    return event.data.order
  })
  if (!applied) return undefined

  const { order } = event.data
  // A refusal puts the items back in the cart; a confirmation leaves it as the order emptied it.
  if (order.status !== 'pending') void queryClient.invalidateQueries({ queryKey: cartKeys.current })
  // The receipt dialog speaks for itself; elsewhere a toast tells the outcome.
  if (watched) return undefined
  if (order.status === 'confirmed') return `Pedido ${order.id} confirmado.`
  if (order.status === 'refused') return `Pagamento do pedido ${order.id} recusado. Os NFTs voltaram ao carrinho.`
  return undefined
}

/** After a reconnection, events may have been missed: refetch what is on screen from REST. */
export function reconcile(queryClient: QueryClient) {
  const userId = currentUserId(queryClient)
  void queryClient.invalidateQueries({ queryKey: nftKeys.all })
  void queryClient.invalidateQueries({ queryKey: cartKeys.current })
  if (userId) void queryClient.invalidateQueries({ queryKey: orderKeys.all(userId) })
}
