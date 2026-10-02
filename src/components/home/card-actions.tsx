import { Link } from '@tanstack/react-router'
import type { ComponentProps, ReactNode } from 'react'
import cartIcon from '@/assets/figma/cart.svg'
import heartIcon from '@/assets/figma/heart-sm.svg'
import searchIcon from '@/assets/figma/search.svg'
import { FilledHeart } from '@/components/nft/favorite-heart'
import { useFavoriteToggle } from '@/components/nft/use-favorite-toggle'
import { useAddToCart } from '@/lib/api/cart'
import { getErrorMessage } from '@/lib/api/errors'
import type { Nft } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const actionClass =
  'grid size-[34px] place-items-center rounded-md border border-border bg-card/90 transition-colors hover:border-primary aria-busy:cursor-progress disabled:opacity-60'

function Action({ label, children, ...props }: { label: string; children: ReactNode } & Omit<ComponentProps<'button'>, 'aria-label'>) {
  return (
    <button type="button" aria-label={label} className={actionClass} {...props}>
      {children}
    </button>
  )
}

/**
 * Desktop card actions from the design: add to cart, favorite and open the detail. They show on hover and whenever one
 * of them has keyboard focus, so they stay reachable without a mouse.
 */
export function CardActions({ nft, onFeedback }: { nft: Nft; onFeedback: (message: string) => void }) {
  const favorite = useFavoriteToggle(nft, onFeedback)
  const addToCart = useAddToCart()
  // The quick add takes one unit of the first edition still on sale; the detail page offers the others.
  const edition = nft.editions.find((item) => item.available > 0)

  const onAdd = () => {
    if (!edition) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: 1 },
      {
        onSuccess: () => onFeedback(`${nft.name} (edição ${edition.label}) foi adicionado ao carrinho.`),
        onError: (error) => onFeedback(`Não foi possível adicionar ao carrinho. ${getErrorMessage(error)}`),
      },
    )
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-2.5 z-10 hidden justify-center gap-2.5 md:flex',
        'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none',
      )}
    >
      <Action
        label={edition ? `Adicionar ${nft.name} ao carrinho` : `${nft.name} está esgotado`}
        disabled={!edition}
        aria-busy={addToCart.isPending || undefined}
        onClick={onAdd}
      >
        <img src={cartIcon} alt="" width={18} height={18} />
      </Action>
      <Action label={`Favoritar ${nft.name}`} aria-pressed={favorite.active} aria-busy={favorite.busy || undefined} onClick={favorite.onToggle}>
        {favorite.active ? <FilledHeart width={16} height={14.23} className="bg-primary" /> : <img src={heartIcon} alt="" width={16} height={14.23} />}
      </Action>
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={`Ver detalhes de ${nft.name}`} className={actionClass}>
        <img src={searchIcon} alt="" width={16} height={16} />
      </Link>
    </div>
  )
}
