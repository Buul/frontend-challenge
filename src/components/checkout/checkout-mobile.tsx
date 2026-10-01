import arrowBack from '@/assets/figma/arrow-back.svg'
import dots from '@/assets/figma/dots.svg'
import walletIcon from '@/assets/figma/wallet.svg'
import { RadioMark } from '@/components/checkout/radio-mark'
import { SAVED_WALLETS, type SavedWallet } from '@/components/checkout/wallets'
import type { Cart } from '@/lib/api/types'
import { WALLETS, type WalletId } from '@/lib/api/types'
import { formatEth, shortenAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const confirmClass =
  'flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(108.86deg,var(--primary)_3.96%,color-mix(in_srgb,var(--primary)_80%,transparent)_121.97%)] text-base leading-4 font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

function ProviderMark({ id }: { id: WalletId }) {
  if (id === 'coinbase') return <img src={walletIcon} alt="" width={20.101} height={18.5781} />
  return (
    <span className="grid size-8 place-items-center rounded-full border border-primary text-sm font-bold text-brand">
      {id === 'metamask' ? 'M' : 'W'}
    </span>
  )
}

function displayAddress(address: string) {
  return address.includes('.') ? address : shortenAddress(address)
}

type CheckoutMobileProps = {
  cart: Cart
  pending?: boolean
  notice?: string
  onBack: () => void
  onConfirm: (account: SavedWallet, walletType: WalletId) => void
}

export function CheckoutMobile({ cart, pending, notice, onBack, onConfirm }: CheckoutMobileProps) {
  const [accountId, setAccountId] = useState<SavedWallet['id']>(SAVED_WALLETS[0].id)
  const [walletType, setWalletType] = useState<WalletId>('coinbase')
  const [hint, setHint] = useState<string>()
  const account = SAVED_WALLETS.find((item) => item.id === accountId) ?? SAVED_WALLETS[0]

  const switchAccount = () => {
    const next = SAVED_WALLETS.find((item) => item.id !== account.id) ?? SAVED_WALLETS[0]
    setAccountId(next.id)
    setHint(undefined)
  }

  return (
    <div className="flex min-h-dvh flex-col px-7 pt-8 pb-8">
      <header className="relative flex h-11 items-center">
        <button type="button" aria-label="Voltar" onClick={onBack} className="grid size-[35px] place-items-center rounded-full border border-border bg-surface-raised">
          <span className="grid size-5 place-items-center">
            <img src={arrowBack} alt="" width={13.17} height={7.33} className="rotate-90" />
          </span>
        </button>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-xl leading-4 font-bold">Pagamento com carteira</h1>
      </header>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[15px] leading-4 font-bold">Carteira conectada</p>
        <button type="button" onClick={switchAccount} className="text-[15px] leading-4 text-brand">
          Trocar carteira
        </button>
      </div>

      <div role="radiogroup" aria-label="Carteiras salvas" className="mt-4 flex flex-col gap-3">
        {SAVED_WALLETS.map((item) => {
          const selected = item.id === account.id
          return (
            <div key={item.id} className="flex h-[93px] items-center gap-3 rounded-[14px] bg-card px-4 shadow-[0px_6px_20px_0px_rgba(10,6,4,0.45)]">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAccountId(item.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <RadioMark selected={selected} />
                <span className="min-w-0">
                  <span className="block text-[15px] leading-4 font-bold">{item.name}</span>
                  <span className="mt-1.5 block truncate text-sm leading-4 text-muted-foreground">{displayAddress(item.address)}</span>
                  <span className="mt-1 block text-sm leading-4 text-tertiary">{item.networkLabel}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label={`Mais opções de ${item.name}`}
                onClick={() => setHint(`${item.name}: ${item.address}`)}
                className="grid size-8 shrink-0 place-items-center rounded-sm"
              >
                <img src={dots} alt="" width={3} height={15} />
              </button>
            </div>
          )
        })}
      </div>
      {hint && (
        <p role="status" className="mt-3 text-xs leading-4 text-tertiary">
          {hint}
        </p>
      )}

      <fieldset className="mt-8">
        <legend className="text-[15px] leading-4 font-bold">Carteira e rede</legend>
        <div className="mt-3 flex flex-col gap-3">
          {WALLETS.map((wallet) => {
            const selected = walletType === wallet.id
            return (
              <label
                key={wallet.id}
                className={cn(
                  'flex h-[65px] items-center gap-3 rounded-[15px] border bg-card px-4',
                  selected ? 'border-primary' : 'border-transparent',
                )}
              >
                <input type="radio" name="mobile-wallet" value={wallet.id} checked={selected} onChange={() => setWalletType(wallet.id)} className="sr-only" />
                <ProviderMark id={wallet.id} />
                <span className="flex-1 text-[15px] leading-4">{wallet.label}</span>
                <RadioMark selected={selected} />
              </label>
            )
          })}
        </div>
      </fieldset>

      <p className="mt-8 text-right text-base leading-4">
        Total: <span className="font-bold text-brand">{formatEth(cart.total)}</span>
      </p>
      {notice && (
        <p role="alert" className="mt-4 text-center text-[13px] leading-4 text-coral">
          {notice}
        </p>
      )}
      <button type="button" disabled={pending || cart.itemCount === 0} onClick={() => onConfirm(account, walletType)} className={cn(confirmClass, 'mt-6')}>
        Confirmar compra
      </button>
    </div>
  )
}
