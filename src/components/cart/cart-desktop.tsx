import { Link } from '@tanstack/react-router'
import deleteIcon from '@/assets/figma/delete.svg'
import { CartSummary } from '@/components/cart/cart-summary'
import { QuantityStepper } from '@/components/nft/quantity-stepper'
import type { Cart, CartItem } from '@/lib/api/types'
import { formatEth } from '@/lib/format'

export function CartBreadcrumb() {
  return (
    <nav aria-label="Você está em">
      <ol className="flex flex-wrap gap-[1ch] text-[15px] leading-4 font-bold">
        <li>
          <Link to="/" className="rounded-sm hover:text-brand">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="mercado" className="rounded-sm hover:text-brand">
            Mercado
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>Carrinho</li>
      </ol>
    </nav>
  )
}

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <button type="button" aria-label={`Remover ${name} do carrinho`} onClick={onRemove} className="grid size-6 place-items-center rounded-sm hover:opacity-80">
      <img src={deleteIcon} alt="" width={17.6505} height={19.9838} />
    </button>
  )
}

function CartRow({
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
    <article className="grid h-[70px] grid-cols-[minmax(12rem,1.4fr)_auto_auto_minmax(5.5rem,1fr)_24px] items-center gap-4 bg-card pr-6">
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="flex h-full items-center gap-4 rounded-sm">
        <img src={item.image} alt="" width={70} height={70} className="size-[70px] rounded-md object-cover" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="truncate text-base leading-4 font-bold">{item.name}</h2>
          <p className="truncate text-sm leading-4 text-tertiary">ID do token: {item.tokenId}</p>
        </div>
      </Link>
      <p className="text-base leading-4 font-bold text-muted-foreground">{formatEth(item.unitPrice)}</p>
      <QuantityStepper size="sm" value={item.quantity} max={max} onChange={onQuantity} />
      <p className="text-right text-base leading-4 font-bold text-brand">{formatEth(item.lineTotal)}</p>
      <RemoveButton name={item.name} onRemove={onRemove} />
    </article>
  )
}

type CartDesktopProps = {
  cart: Cart
  pending?: boolean
  notice?: string
  onQuantity: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
  onApplyPromo: (code: string) => void
  onCheckout: () => void
}

export function CartDesktop({ cart, pending, notice, onQuantity, onRemove, onApplyPromo, onCheckout }: CartDesktopProps) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">Carrinho de NFTs</h1>
      <CartBreadcrumb />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[782px]">
          <div className="grid grid-cols-[minmax(12rem,1.4fr)_auto_auto_minmax(5.5rem,1fr)_24px] items-center gap-4 pr-6">
            <p className="text-base leading-4 font-bold">NFTs</p>
            <p className="text-base leading-4 font-medium">Preço</p>
            <p className="text-base leading-4 font-bold">Edições</p>
            <p className="text-base leading-4 font-medium">Total</p>
            <span />
          </div>
          <div className="hairline-b" />
          {cart.items.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {cart.items.map((item) => (
                <li key={`${item.nftId}:${item.editionId}`}>
                  <CartRow item={item} onQuantity={(quantity) => onQuantity(item, quantity)} onRemove={() => onRemove(item)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="bg-card px-6 py-10 text-sm text-muted-foreground">Seu carrinho está vazio. Explore o mercado para adicionar NFTs.</p>
          )}
        </div>
        <div className="w-full shrink-0 lg:w-[332px]">
          <CartSummary cart={cart} layout="desktop" pending={pending} notice={notice} onApplyPromo={onApplyPromo} onCheckout={onCheckout} />
        </div>
      </div>
    </div>
  )
}
