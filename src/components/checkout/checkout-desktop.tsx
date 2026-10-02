import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import radioRing from '@/assets/figma/radio-ring.svg'
import { RadioMark } from '@/components/checkout/radio-mark'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { controlClass, EnsField, errorIdFor, SelectField, TextField } from '@/components/ui/form-field'
import type { CheckoutRequest } from '@/lib/api/orders'
import { ApiError } from '@/lib/api/errors'
import { NETWORKS, WALLETS, type Cart, type User } from '@/lib/api/types'
import { fieldError, fieldProps, firstInvalidField, setServerErrors } from '@/lib/forms'
import { formatDiscount, formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { checkoutSchema } from '@/lib/validation'

const FIELDS = [
  'displayName',
  'username',
  'network',
  'profileName',
  'walletAddress',
  'secondaryWallet',
  'walletType',
  'referralCode',
  'email',
  'ensName',
  'ensSuffix',
  'notes',
] as const

type FieldName = (typeof FIELDS)[number]

export type CheckoutDraft = {
  displayName: string
  username: string
  network: string
  profileName: string
  walletAddress: string
  secondaryWallet: string
  walletType: string
  referralCode: string
  email: string
  ensName: string
  ensSuffix: string
  useOtherWallet: boolean
  notes: string
}

type CheckoutDesktopProps = {
  user?: User
  /** What was typed before the form last unmounted (e.g. while the session expired), restored as the starting values. */
  draft?: CheckoutDraft
  onDraft?: (values: CheckoutDraft) => void
  cart: Cart
  pending?: boolean
  notice?: string
  onSubmit: (input: CheckoutRequest) => Promise<void>
}

export function CheckoutDesktop({ user, draft, onDraft, cart, pending, notice, onSubmit }: CheckoutDesktopProps) {
  const refs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})
  const focus = (field?: FieldName) => field && refs.current[field]?.focus()

  // Taken once: the session briefly goes away when it expires, and new defaults would wipe what was typed.
  const [defaultValues] = useState<CheckoutDraft>(() => draft ?? {
    displayName: user?.name ?? '',
    username: '',
    network: '',
    profileName: '',
    walletAddress: '',
    secondaryWallet: '',
    walletType: 'coinbase',
    referralCode: '',
    email: user?.email ?? '',
    ensName: '',
    ensSuffix: 'eth',
    useOtherWallet: false,
    notes: '',
  })

  const form = useForm({
    defaultValues,
    validators: { onSubmit: checkoutSchema },
    onSubmitInvalid: ({ formApi }) => focus(firstInvalidField(formApi, FIELDS)),
    onSubmit: async ({ value, formApi }) => {
      const parsed = checkoutSchema.safeParse(value)
      if (!parsed.success) return
      try {
        await onSubmit(parsed.data)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') focus(setServerErrors(formApi, FIELDS, error.fieldErrors))
      }
    },
  })

  // Hands what was typed to the page when the form goes away, so it can come back filled.
  useEffect(() => () => onDraft?.(form.state.values), [form, onDraft])

  const bind = (name: FieldName) => (node: HTMLElement | null) => {
    refs.current[name] = node
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-10 lg:flex-row lg:items-start"
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        void form.handleSubmit()
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h1 className="sr-only">Pagamento</h1>
        <Breadcrumb current="Pagamento" />
        <h2 className="text-lg leading-4 font-bold">Perfil do colecionador</h2>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <form.Field name="displayName">
            {(field) => <TextField layout="checkout" id="display-name" label="Nome de exibição" required autoComplete="nickname" inputRef={bind('displayName')} {...fieldProps(field)} />}
          </form.Field>
          <form.Field name="username">
            {(field) => <TextField layout="checkout" id="username" label="Nome de usuário" required autoComplete="username" inputRef={bind('username')} {...fieldProps(field)} />}
          </form.Field>
          <form.Field name="network">
            {(field) => (
              <SelectField layout="checkout" id="network" label="Rede" placeholder="Selecione uma rede" required options={NETWORKS} selectRef={bind('network')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="profileName">
            {(field) => <TextField layout="checkout" id="profile-name" label="Nome do perfil" required inputRef={bind('profileName')} {...fieldProps(field)} />}
          </form.Field>
          <form.Field name="walletAddress">
            {(field) => (
              <TextField
                layout="checkout"
                id="wallet-address"
                label="Endereço da carteira"
                required
                placeholder="Endereço 0x da carteira"
                autoComplete="off"
                spellCheck={false}
                inputRef={bind('walletAddress')}
                {...fieldProps(field)}
              />
            )}
          </form.Field>
          <form.Field name="secondaryWallet">
            {(field) => (
              <TextField
                layout="checkout"
                id="secondary-wallet"
                ariaLabel="ENS ou carteira secundária (opcional)"
                placeholder="ENS ou carteira secundária (opcional)"
                autoComplete="off"
                spellCheck={false}
                inputRef={bind('secondaryWallet')}
                {...fieldProps(field)}
              />
            )}
          </form.Field>
          <form.Field name="walletType">
            {(field) => (
              <SelectField layout="checkout" id="wallet-type" label="Tipo de carteira" placeholder="Selecione uma carteira" required options={WALLETS} selectRef={bind('walletType')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="referralCode">
            {(field) => (
              <TextField layout="checkout" id="referral-code" label="Código de indicação" required autoComplete="off" spellCheck={false} inputRef={bind('referralCode')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <TextField layout="checkout" id="checkout-email" label="E-mail" required type="email" inputMode="email" autoComplete="email" inputRef={bind('email')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="ensName">
            {(name) => (
              <form.Field name="ensSuffix">
                {(suffix) => (
                  <EnsField
                    layout="checkout"
                    id="ens-name"
                    required
                    name={{ ...fieldProps(name), inputRef: bind('ensName') }}
                    suffix={{ ...fieldProps(suffix), selectRef: bind('ensSuffix') }}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        </div>

        <form.Field name="useOtherWallet">
          {(field) => (
            <label className="flex w-fit items-center gap-2 text-[15px] leading-4">
              <span className="relative grid size-[15px] place-items-center">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  className="sr-only"
                />
                <img src={radioRing} alt="" width={15} height={15} />
                {field.state.value && <span className="absolute size-2 rounded-full bg-primary" />}
              </span>
              Usar outra carteira?
            </label>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => {
            const error = fieldError(field.state.meta.errors)
            return (
              <div className="flex max-w-[350px] flex-col gap-3">
                <textarea
                  ref={bind('notes')}
                  id="checkout-notes"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Observação do colecionador (opcional)"
                  aria-label="Observação do colecionador (opcional)"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorIdFor('checkout-notes') : undefined}
                  className={cn(controlClass, 'h-[152px] resize-none py-3')}
                />
                {error && (
                  <p id={errorIdFor('checkout-notes')} className="text-[13px] leading-4 text-coral">
                    {error}
                  </p>
                )}
              </div>
            )
          }}
        </form.Field>
      </div>

      <aside aria-labelledby="order-summary-title" className="flex w-full shrink-0 flex-col gap-4 lg:w-[405px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="order-summary-title" className="text-lg leading-4 font-bold">
              Seus NFTs
            </h2>
            <span className="text-[15px] leading-4">Subtotal</span>
          </div>
          <div className="hairline-b" />
        </div>
        <ul className="flex flex-col gap-3">
          {cart.items.map((item) => (
            <li key={`${item.nftId}:${item.editionId}`} className="flex h-[70px] items-center gap-3 bg-card pr-3">
              <img src={item.image} alt="" width={70} height={70} className="size-[70px] rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-4 font-bold">{item.name}</p>
                <p className="mt-1.5 truncate text-sm leading-4 text-tertiary">
                  ID do token: {item.tokenId} <span className="text-muted-foreground">(x{item.quantity})</span>
                </p>
              </div>
              <p className="text-lg leading-4 font-bold text-brand">{formatEth(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm leading-4">
          Tem um código promocional?{' '}
          <Link to="/cart" className="text-brand hover:underline">
            Aplique aqui
          </Link>
        </p>
        <dl className="flex flex-col gap-3">
          <div className="flex justify-between text-[15px]">
            <dt>Subtotal</dt>
            <dd className="text-lg leading-4">{formatEth(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[15px]">
            <dt>Desconto do lançamento</dt>
            <dd>{formatDiscount(cart.discount)}</dd>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[15px]">
              <dt>Taxa de rede</dt>
              <dd className="text-lg leading-4">{formatEth(cart.networkFee)}</dd>
            </div>
            <p className="text-center text-xs leading-4 text-brand">Taxa estimada</p>
          </div>
          <div className="hairline-b" />
          <div className="flex justify-between font-bold">
            <dt className="text-base leading-4">Total</dt>
            <dd className="text-lg leading-4 text-brand">{formatEth(cart.total)}</dd>
          </div>
        </dl>

        <form.Field name="walletType">
          {(field) => (
            <fieldset>
              <legend className="text-[15px] leading-4 font-bold">Carteira e rede</legend>
              <div className="mt-3 flex flex-col gap-2">
                {WALLETS.map((wallet) => {
                  const selected = field.state.value === wallet.id
                  return (
                    <label
                      key={wallet.id}
                      className={cn(
                        'flex h-[45px] items-center gap-3 rounded-[3px] border px-3',
                        selected ? 'border-primary' : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="walletType"
                        value={wallet.id}
                        checked={selected}
                        onChange={() => field.handleChange(wallet.id)}
                        className="sr-only"
                      />
                      <RadioMark selected={selected} />
                      {wallet.id === 'walletconnect' ? (
                        <>
                          <span className="sr-only">WalletConnect</span>
                          <span
                            aria-hidden
                            className="flex h-[26px] flex-1 items-center justify-center rounded-md border border-border-soft bg-surface-dark text-[9px] font-bold tracking-[0.1px] whitespace-pre text-brand"
                          >
                            {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[15px] leading-4">{wallet.label}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
        </form.Field>

        {notice && (
          <p role="alert" className="text-center text-[13px] leading-4 text-coral">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || cart.itemCount === 0}
          className="flex h-[45px] items-center justify-center rounded-lg bg-primary text-[15px] leading-4 font-bold text-primary-foreground hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar compra
        </button>
      </aside>
    </form>
  )
}
