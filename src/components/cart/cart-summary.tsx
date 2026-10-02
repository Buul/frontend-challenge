import { Link } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import type { Cart } from '@/lib/api/types'
import { formatDiscount, formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

type CartSummaryProps = {
  cart: Cart
  layout: 'desktop' | 'mobile'
  pending?: boolean
  signedIn?: boolean
  notice?: string
  onApplyPromo: (code: string) => void
  onRemovePromo: () => void
  onCheckout: () => void
}

export function CartSummary({ cart, layout, pending, signedIn, notice, onApplyPromo, onRemovePromo, onCheckout }: CartSummaryProps) {
  const [code, setCode] = useState(cart.promoCode ?? '')
  const isMobile = layout === 'mobile'
  const empty = cart.itemCount === 0

  const submitPromo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    onApplyPromo(code)
  }

  return (
    <section aria-labelledby="cart-summary-title" className={cn('flex w-full flex-col', isMobile ? 'gap-0' : 'gap-6')}>
      {!isMobile && (
        <div className="flex flex-col gap-3">
          <h2 id="cart-summary-title" className="text-lg leading-4 font-bold">
            Resumo da carteira
          </h2>
          <div className="hairline-b" />
        </div>
      )}

      <div className={cn('flex flex-col', isMobile ? 'gap-3' : 'gap-2')}>
        {isMobile ? (
          <h2 id="cart-summary-title" className="sr-only">
            Resumo da carteira
          </h2>
        ) : (
          <p className="text-sm leading-4 font-bold">Código promocional</p>
        )}
        <form onSubmit={submitPromo} className={cn('flex items-center overflow-hidden border border-primary', isMobile ? 'h-[50px] rounded-[40px]' : 'h-10 rounded-[3px]')}>
          <label htmlFor="promo-code" className="sr-only">
            Código promocional
          </label>
          <input
            id="promo-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Digite o código promocional..."
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'min-w-0 flex-1 bg-transparent px-2 text-tertiary outline-none placeholder:text-tertiary',
              isMobile ? 'px-4 text-[13px] leading-[22px]' : 'text-xs leading-4',
            )}
          />
          <button
            type="submit"
            disabled={pending}
            className={cn(
              'flex h-full shrink-0 items-center justify-center font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-70',
              isMobile
                ? 'w-[97px] rounded-[40px] bg-[linear-gradient(96deg,rgba(210,138,76,0.54)_0.94%,var(--primary)_105%)] text-[15px] leading-4'
                : 'w-[102px] bg-primary text-[15px] leading-4',
            )}
          >
            Aplicar
          </button>
        </form>
        {cart.promoCode && (
          <div className="flex items-center justify-between gap-3 text-xs leading-4">
            <p className="text-brand">Cupom {cart.promoCode} aplicado.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setCode('')
                onRemovePromo()
              }}
              className="rounded-sm underline underline-offset-2 hover:text-brand disabled:opacity-60"
            >
              Remover cupom
            </button>
          </div>
        )}
      </div>

      <dl className={cn('flex flex-col', isMobile ? 'mt-3 gap-3' : 'gap-3')}>
        <div className="flex items-start justify-between text-[15px]">
          <dt>Subtotal</dt>
          <dd className={cn('text-right', isMobile ? 'text-base leading-4' : 'text-lg leading-4')}>{formatEth(cart.subtotal)}</dd>
        </div>
        <div className="flex items-start justify-between text-[15px]">
          <dt>Desconto do lançamento</dt>
          <dd>{formatDiscount(cart.discount)}</dd>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex w-full items-center justify-between text-[15px]">
            <dt>Taxa de rede</dt>
            <dd className={cn('text-right', isMobile ? 'text-base leading-4' : 'text-lg leading-4')}>{formatEth(cart.networkFee)}</dd>
          </div>
          <p className="text-xs leading-4 text-brand">Taxa estimada</p>
        </div>
        <div className="flex items-start justify-between font-bold">
          <dt className={isMobile ? 'text-base leading-4' : 'text-base leading-4'}>Total</dt>
          <dd className={cn('text-right text-brand', isMobile ? 'text-lg leading-4' : 'text-lg leading-4')}>{formatEth(cart.total)}</dd>
        </div>
      </dl>

      <div className={cn('flex flex-col items-center', isMobile ? 'mt-6' : 'gap-3')}>
        <button
          type="button"
          onClick={onCheckout}
          disabled={empty || pending}
          className={cn(
            'flex w-full items-center justify-center bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50',
            isMobile
              ? 'h-[60px] rounded-[40px] bg-[linear-gradient(108.86deg,var(--primary)_3.96%,color-mix(in_srgb,var(--primary)_80%,transparent)_121.97%)] text-base leading-4'
              : 'h-10 rounded-[3px] text-[15px] leading-4',
          )}
        >
          {signedIn ? 'Finalizar' : 'Conectar e finalizar'}
        </button>
        {!isMobile && (
          <Link to="/" hash="mercado" className="rounded-sm text-[15px] text-brand hover:underline">
            Continuar explorando
          </Link>
        )}
        {notice && (
          <p role="status" className="w-full text-center text-xs leading-4 text-tertiary">
            {notice}
          </p>
        )}
      </div>
    </section>
  )
}
