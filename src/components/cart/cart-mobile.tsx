import { Link } from '@tanstack/react-router'
import arrowBack from '@/assets/figma/arrow-back.svg'
import deleteIcon from '@/assets/figma/delete.svg'
import { CartSummary } from '@/components/cart/cart-summary'
import { QuantityStepper } from '@/components/nft/quantity-stepper'
import type { Cart, CartItem } from '@/lib/api/types'
import { formatEth } from '@/lib/format'

function CartCard({
  item,
  onQuantity,
  onRemove,
}: {
  item: CartItem
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const max = Math.max(1, Math.min(item.available, item.maxPerOrder))

  return (
    <article className="relative flex h-[100px] overflow-hidden rounded-[14px] bg-card shadow-[0px_6px_20px_0px_rgba(10,6,4,0.45)]">
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="shrink-0">
        <img src={item.image} alt="" width={100} height={100} className="size-[100px] rounded-l-[14px] object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-3 pr-3 pl-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] leading-4 font-bold">{item.name}</h2>
            <p className="mt-1.5 truncate text-sm leading-4 text-muted-foreground">Edição: {item.editionLabel}</p>
          </div>
          <button type="button" aria-label={`Remover ${item.name} do carrinho`} onClick={onRemove} className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm hover:opacity-80">
            <img src={deleteIcon} alt="" width={17.6505} height={19.9838} />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-lg leading-4 font-bold text-brand">{formatEth(item.lineTotal)}</p>
          <QuantityStepper size="cart" value={item.quantity} max={max} onChange={onQuantity} />
        </div>
      </div>
    </article>
  )
}

type CartMobileProps = {
  cart: Cart
  pending?: boolean
  notice?: string
  onBack: () => void
  onQuantity: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
  onApplyPromo: (code: string) => void
  onCheckout: () => void
}

export function CartMobile({ cart, pending, notice, onBack, onQuantity, onRemove, onApplyPromo, onCheckout }: CartMobileProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-3 px-7 pt-8">
        <header className="relative flex h-11 items-center">
          <button type="button" aria-label="Voltar" onClick={onBack} className="grid size-[35px] place-items-center rounded-full border border-border bg-surface-raised">
            <span className="grid size-5 place-items-center">
              <img src={arrowBack} alt="" width={13.17} height={7.33} className="rotate-90" />
            </span>
          </button>
          <h1 className="pointer-events-none absolute inset-x-0 text-center text-xl leading-4 font-bold">Carrinho de NFTs</h1>
        </header>

        {cart.items.length > 0 ? (
          <ul className="flex flex-col gap-5 pb-4">
            {cart.items.map((item) => (
              <li key={`${item.nftId}:${item.editionId}`}>
                <CartCard item={item} onQuantity={(quantity) => onQuantity(item, quantity)} onRemove={() => onRemove(item)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-sm text-muted-foreground">Seu carrinho está vazio. Explore o mercado para adicionar NFTs.</p>
        )}
      </div>

      <div className="mt-auto flex flex-1 flex-col justify-between rounded-t-[40px] bg-card px-6 pt-6 pb-[36px]">
        <CartSummary cart={cart} layout="mobile" pending={pending} notice={notice} onApplyPromo={onApplyPromo} onCheckout={onCheckout} />
      </div>
    </div>
  )
}
