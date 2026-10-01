import { useState } from 'react'
import { useAddToCart } from '@/lib/api/cart'
import { getErrorMessage } from '@/lib/api/errors'
import type { NftDetail, NftEdition } from '@/lib/api/types'
import { multiplyEth } from '@/lib/eth'

/** Falls back to the first edition with stock when the requested one is missing (e.g. a stale `?edition=` link). */
const resolveEdition = (editions: NftEdition[], id: string | undefined) =>
  editions.find((edition) => edition.id === id) ?? editions.find((edition) => edition.available > 0) ?? editions[0]

export function usePurchase(
  nft: NftDetail,
  editionId: string | undefined,
  onEditionChange: (id: string) => void,
  onAdded: (intent: 'buy' | 'add') => void,
  onError: (message: string) => void,
) {
  const addToCart = useAddToCart()
  const [requested, setRequested] = useState(1)
  const edition = resolveEdition(nft.editions, editionId)
  const soldOut = edition.available === 0
  const maxQuantity = Math.max(1, Math.min(edition.available, edition.maxPerOrder))
  // Clamped on every render so a stock drop (refetch or realtime update) can never leave an invalid quantity.
  const quantity = Math.min(Math.max(requested, 1), maxQuantity)

  const notice = soldOut
    ? 'Esta edição está esgotada. Escolha outra edição.'
    : quantity < maxQuantity
      ? undefined
      : edition.available < edition.maxPerOrder
        ? `Apenas ${edition.available} ${edition.available === 1 ? 'unidade disponível' : 'unidades disponíveis'} nesta edição.`
        : `Limite de ${edition.maxPerOrder} por pedido nesta edição.`

  const submit = (intent: 'buy' | 'add') => {
    if (soldOut || addToCart.isPending) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => onAdded(intent),
        onError: (error) => onError(getErrorMessage(error)),
      },
    )
  }

  return {
    edition,
    soldOut,
    busy: addToCart.isPending,
    quantity,
    maxQuantity,
    total: multiplyEth(nft.price, quantity),
    notice,
    setQuantity: setRequested,
    selectEdition: (id: string) => {
      setRequested(1)
      onEditionChange(id)
    },
    buy: () => submit('buy'),
    add: () => submit('add'),
  }
}

export type Purchase = ReturnType<typeof usePurchase>
