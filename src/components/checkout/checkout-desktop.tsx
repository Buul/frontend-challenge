import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { useRef, type ReactNode } from 'react'
import arrowDown from '@/assets/figma/arrow-down.svg'
import radioRing from '@/assets/figma/radio-ring.svg'
import { RadioMark } from '@/components/checkout/radio-mark'
import type { CheckoutRequest } from '@/lib/api/orders'
import { ApiError } from '@/lib/api/errors'
import { ENS_SUFFIXES, NETWORKS, WALLETS, type Cart, type User } from '@/lib/api/types'
import { fieldError, firstInvalidField, setServerErrors } from '@/lib/forms'
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

type CheckoutValues = {
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

const controlClass =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm leading-4 text-foreground outline-none placeholder:text-sm placeholder:text-tertiary focus-visible:border-primary aria-invalid:border-coral'

function Field({ id, label, required, error, children }: { id?: string; label?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {label ? (
        <label htmlFor={id} className="text-[15px] leading-[22px]">
          {label}
          {required && (
            <span aria-hidden className="text-[22px] leading-none text-coral">
              *
            </span>
          )}
        </label>
      ) : (
        <span aria-hidden className="hidden leading-[22px] sm:block">
          &nbsp;
        </span>
      )}
      {children}
      {error && <p className="text-[13px] leading-4 text-coral">{error}</p>}
    </div>
  )
}

function SelectArrow() {
  return <img src={arrowDown} alt="" width={10.8333} height={6.16667} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
}

function CheckoutBreadcrumb() {
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
        <li>Pagamento</li>
      </ol>
    </nav>
  )
}

type CheckoutDesktopProps = {
  user?: User
  cart: Cart
  pending?: boolean
  notice?: string
  onSubmit: (input: CheckoutRequest) => Promise<void>
}

export function CheckoutDesktop({ user, cart, pending, notice, onSubmit }: CheckoutDesktopProps) {
  const refs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})
  const focus = (field?: FieldName) => field && refs.current[field]?.focus()

  const defaultValues: CheckoutValues = {
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
  }

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
        <CheckoutBreadcrumb />
        <h2 className="text-lg leading-4 font-bold">Perfil do colecionador</h2>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <form.Field name="displayName">
            {(field) => (
              <Field id="display-name" label="Nome de exibição" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('displayName')}
                  id="display-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="nickname"
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="username">
            {(field) => (
              <Field id="username" label="Nome de usuário" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('username')}
                  id="username"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="username"
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="network">
            {(field) => (
              <Field id="network" label="Rede" required error={fieldError(field.state.meta.errors)}>
                <div className="relative">
                  <select
                    ref={bind('network')}
                    id="network"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                    className={cn(controlClass, 'appearance-none pr-8', !field.state.value && 'text-tertiary')}
                  >
                    <option value="">Selecione uma rede</option>
                    {NETWORKS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
              </Field>
            )}
          </form.Field>
          <form.Field name="profileName">
            {(field) => (
              <Field id="profile-name" label="Nome do perfil" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('profileName')}
                  id="profile-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="walletAddress">
            {(field) => (
              <Field id="wallet-address" label="Endereço da carteira" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('walletAddress')}
                  id="wallet-address"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Endereço 0x da carteira"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="secondaryWallet">
            {(field) => (
              <Field error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('secondaryWallet')}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="ENS ou carteira secundária (opcional)"
                  aria-label="ENS ou carteira secundária (opcional)"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="walletType">
            {(field) => (
              <Field id="wallet-type" label="Tipo de carteira" required error={fieldError(field.state.meta.errors)}>
                <div className="relative">
                  <select
                    ref={bind('walletType')}
                    id="wallet-type"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                    className={cn(controlClass, 'appearance-none pr-8', !field.state.value && 'text-tertiary')}
                  >
                    <option value="">Selecione uma carteira</option>
                    {WALLETS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
              </Field>
            )}
          </form.Field>
          <form.Field name="referralCode">
            {(field) => (
              <Field id="referral-code" label="Código de indicação" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('referralCode')}
                  id="referral-code"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <Field id="checkout-email" label="E-mail" required error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('email')}
                  id="checkout-email"
                  type="email"
                  inputMode="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                  className={controlClass}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="ensName">
            {(field) => (
              <Field id="ens-name" label="Nome ENS" required error={fieldError(field.state.meta.errors)}>
                <div className="flex gap-2">
                  <input
                    ref={bind('ensName')}
                    id="ens-name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                    className={cn(controlClass, 'max-w-[78px]')}
                  />
                  <form.Field name="ensSuffix">
                    {(suffix) => (
                      <div className="relative w-[78px]">
                        <select
                          ref={bind('ensSuffix')}
                          aria-label="Sufixo do nome ENS"
                          value={suffix.state.value}
                          onBlur={suffix.handleBlur}
                          onChange={(event) => suffix.handleChange(event.target.value)}
                          className={cn(controlClass, 'appearance-none pr-8')}
                        >
                          {ENS_SUFFIXES.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <SelectArrow />
                      </div>
                    )}
                  </form.Field>
                </div>
              </Field>
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
          {(field) => (
            <div className="flex max-w-[350px] flex-col gap-3">
              <textarea
                ref={bind('notes')}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Observação do colecionador (opcional)"
                aria-label="Observação do colecionador (opcional)"
                aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                className={cn(controlClass, 'h-[152px] resize-none py-3')}
              />
              {fieldError(field.state.meta.errors) && <p className="text-[13px] leading-4 text-coral">{fieldError(field.state.meta.errors)}</p>}
            </div>
          )}
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
