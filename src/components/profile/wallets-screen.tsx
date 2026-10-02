import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState, type ReactNode } from 'react'
import arrowIcon from '@/assets/figma/wallet-arrow.svg'
import radioIcon from '@/assets/figma/wallet-radio.svg'
import { AccountSidebar } from '@/components/profile/account-sidebar'
import { InlineAlert, RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogout, useSession } from '@/lib/api/auth'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { ENS_SUFFIXES, NETWORKS, WALLETS, type CollectorWallet, type CollectorWallets, type EnsSuffix, type NetworkId, type WalletId } from '@/lib/api/types'
import { useCollectorWallets, useUpdateWallets } from '@/lib/api/wallets'
import { authIntent } from '@/lib/auth/auth-dialog'
import { fieldError, firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { walletSchema } from '@/lib/validation'

const FIELDS = [
  'displayName',
  'walletNickname',
  'network',
  'profileName',
  'walletAddress',
  'secondaryAddress',
  'walletType',
  'referralCode',
  'email',
  'ensSuffix',
  'ensName',
] as const

type FieldName = (typeof FIELDS)[number]

type WalletValues = {
  displayName: string
  walletNickname: string
  network: string
  profileName: string
  walletAddress: string
  secondaryAddress: string
  walletType: string
  referralCode: string
  email: string
  ensName: string
  ensSuffix: string
}

const controlClass =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm leading-4 text-foreground outline-none placeholder:text-sm placeholder:text-tertiary focus-visible:border-primary aria-invalid:border-coral'

const rowClass = 'flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0'

function emptyValues(wallet: CollectorWallet | null): WalletValues {
  return {
    displayName: wallet?.displayName ?? '',
    walletNickname: wallet?.walletNickname ?? '',
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? '',
    walletAddress: wallet?.walletAddress ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    walletType: wallet?.walletType ?? '',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? '',
    ensName: wallet?.ensName ?? '',
    ensSuffix: wallet?.ensSuffix ?? 'eth',
  }
}

function toWallet(value: WalletValues): CollectorWallet | undefined {
  const network = NETWORKS.find((item) => item.id === value.network)?.id
  const walletType = WALLETS.find((item) => item.id === value.walletType)?.id
  const ensSuffix: EnsSuffix | undefined = value.ensSuffix === 'sol' || value.ensSuffix === 'eth' ? value.ensSuffix : undefined
  if (!network || !walletType || !ensSuffix) return undefined
  return {
    displayName: value.displayName,
    walletNickname: value.walletNickname,
    network,
    profileName: value.profileName,
    walletAddress: value.walletAddress,
    secondaryAddress: value.secondaryAddress,
    walletType,
    referralCode: value.referralCode,
    email: value.email,
    ensName: value.ensName,
    ensSuffix,
  }
}

export function WalletsScreen() {
  const { user, isPending } = useSession()
  const wallets = useCollectorWallets(user?.id)

  if (isPending || (user && wallets.isPending)) return <WalletsSkeleton />
  if (!user) return <SignedOut />
  if (!wallets.data) {
    return (
      <RetryAlert
        message={<>Não foi possível carregar as carteiras. {getErrorMessage(wallets.error)}</>}
        onRetry={() => void wallets.refetch()}
      />
    )
  }

  return <WalletsEditor userId={user.id} book={wallets.data} />
}

function WalletsEditor({ userId, book }: { userId: string; book: CollectorWallets }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const update = useUpdateWallets(userId)
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [mirrorNotice, setMirrorNotice] = useState('')
  const showSecondary = addingSecondary || Boolean(book.secondary)

  const onLogout = () => {
    logout.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) })
  }

  const onMirror = () => {
    setMirrorNotice('')
    const next = !book.mirrorPrimary
    if (next) setAddingSecondary(false)
    update.mutate(
      { action: 'mirror', mirrorPrimary: next },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.fieldErrors.mirrorPrimary) {
            setMirrorNotice(error.fieldErrors.mirrorPrimary)
            return
          }
          setMirrorNotice(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:items-start min-[1440px]:gap-7">
      <AccountSidebar active="wallets" onLogout={onLogout} logoutPending={logout.isPending} />
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <WalletEditor
          idPrefix="primary"
          title="Carteira principal"
          description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
          showAdd
          initial={book.primary}
          pending={update.isPending}
          onSave={async (value) => {
            const wallet = toWallet(value)
            if (!wallet) return
            await update.mutateAsync({ action: 'save', slot: 'primary', wallet })
          }}
        />
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 min-[1440px]:flex-row min-[1440px]:items-center min-[1440px]:justify-between">
            <h2 className="text-[17px] leading-4 font-bold">Carteira secundária</h2>
            <div className="flex items-center justify-between gap-6 min-[1440px]:w-[343px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={book.mirrorPrimary}
                disabled={update.isPending}
                onClick={onMirror}
                className="flex items-center gap-2 text-sm leading-4 disabled:opacity-60 min-[1440px]:whitespace-nowrap"
              >
                <span className="relative grid size-4 shrink-0 place-items-center">
                  <img src={radioIcon} alt="" width={16} height={16} />
                  {book.mirrorPrimary && <span className="absolute size-2.5 rounded-full bg-primary" />}
                </span>
                Igual à carteira principal
              </button>
              <button
                type="button"
                onClick={() => {
                  setMirrorNotice('')
                  setAddingSecondary(true)
                  if (book.mirrorPrimary) update.mutate({ action: 'mirror', mirrorPrimary: false })
                }}
                className="text-base leading-4 font-medium text-brand"
              >
                Adicionar
              </button>
            </div>
          </div>
          {mirrorNotice && (
            <p role="alert" className="text-[13px] leading-4 text-coral">
              {mirrorNotice}
            </p>
          )}
          {!showSecondary && !book.mirrorPrimary && (
            <p className="text-sm leading-[15px] text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
          )}
          {showSecondary && !book.mirrorPrimary && (
            <WalletEditor
              idPrefix="secondary"
              initial={book.secondary}
              pending={update.isPending}
              savedLabel="Carteira secundária salva."
              onSave={async (value) => {
                const wallet = toWallet(value)
                if (!wallet) return
                await update.mutateAsync({ action: 'save', slot: 'secondary', wallet })
                setAddingSecondary(false)
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function WalletEditor({
  idPrefix,
  title,
  description,
  showAdd,
  initial,
  pending,
  savedLabel = 'Carteira salva.',
  onSave,
}: {
  idPrefix: string
  title?: string
  description?: string
  showAdd?: boolean
  initial: CollectorWallet | null
  pending: boolean
  savedLabel?: string
  onSave: (value: WalletValues) => Promise<void>
}) {
  const [status, setStatus] = useState('')
  const [banner, setBanner] = useState<string>()
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLSelectElement | null>>>({})
  const focus = (field?: FieldName) => field && refs.current[field]?.focus()
  const bind = (field: FieldName) => (node: HTMLInputElement | HTMLSelectElement | null) => {
    refs.current[field] = node
  }

  const form = useForm({
    defaultValues: emptyValues(initial) as WalletValues,
    validators: { onSubmit: walletSchema },
    onSubmitInvalid: ({ formApi }) => focus(firstInvalidField(formApi, FIELDS)),
    onSubmit: async ({ value, formApi }) => {
      try {
        await onSave(value)
        setBanner(undefined)
        setStatus(savedLabel)
      } catch (error) {
        if (!(error instanceof ApiError)) return
        if (error.code === 'VALIDATION_ERROR') focus(setServerErrors(formApi, FIELDS, error.fieldErrors))
        else setBanner(formErrorMessage(error))
      }
    },
  })

  return (
    <form
      noValidate
      aria-busy={pending}
      onSubmit={(event) => handleAuthSubmit(event, pending, () => form.handleSubmit(), () => setStatus(''))}
      className="flex flex-col gap-8"
    >
      {(title || description) && (
        <div className="flex flex-col gap-2">
          {title && (
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-[17px] leading-4 font-bold">{title}</h1>
              {showAdd && (
                <button type="button" onClick={() => focus('displayName')} className="text-base font-medium text-brand">
                  Adicionar
                </button>
              )}
            </div>
          )}
          {description && <p className="text-sm leading-[15px] text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="flex flex-col gap-6">
        <div className={rowClass}>
          <form.Field name="displayName">
            {(field) => (
              <TextField
                id={`${idPrefix}-display-name`}
                label="Nome de exibição"
                required
                autoComplete="nickname"
                fieldRef={bind('displayName')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="walletNickname">
            {(field) => (
              <TextField
                id={`${idPrefix}-nickname`}
                label="Apelido da carteira"
                required
                fieldRef={bind('walletNickname')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
        <div className={rowClass}>
          <form.Field name="network">
            {(field) => (
              <SelectField
                id={`${idPrefix}-network`}
                label="Rede"
                placeholder="Selecione uma rede"
                required
                fieldRef={bind('network')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                options={NETWORKS}
              />
            )}
          </form.Field>
          <form.Field name="profileName">
            {(field) => (
              <TextField
                id={`${idPrefix}-profile-name`}
                label="Nome do perfil"
                required
                fieldRef={bind('profileName')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
        <div className={cn(rowClass, 'min-[1440px]:items-end')}>
          <form.Field name="walletAddress">
            {(field) => (
              <TextField
                id={`${idPrefix}-address`}
                label="Endereço da carteira"
                required
                placeholder="Endereço 0x da carteira"
                spellCheck={false}
                autoComplete="off"
                fieldRef={bind('walletAddress')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="secondaryAddress">
            {(field) => (
              <Field error={fieldError(field.state.meta.errors)}>
                <input
                  ref={bind('secondaryAddress')}
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
        </div>
        <div className={rowClass}>
          <form.Field name="walletType">
            {(field) => (
              <SelectField
                id={`${idPrefix}-type`}
                label="Tipo de carteira"
                placeholder="Selecione uma carteira"
                required
                fieldRef={bind('walletType')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                options={WALLETS}
              />
            )}
          </form.Field>
          <form.Field name="referralCode">
            {(field) => (
              <TextField
                id={`${idPrefix}-referral`}
                label="Código de indicação"
                required
                autoComplete="off"
                fieldRef={bind('referralCode')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
        <div className={rowClass}>
          <form.Field name="email">
            {(field) => (
              <TextField
                id={`${idPrefix}-email`}
                label="E-mail"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                fieldRef={bind('email')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="ensName">
            {(field) => (
              <Field label="Nome ENS" required error={fieldError(field.state.meta.errors)} htmlFor={`${idPrefix}-ens`}>
                <div className="flex w-full gap-2.5">
                  <form.Field name="ensSuffix">
                    {(suffix) => (
                      <div className="relative w-[78px] shrink-0">
                        <select
                          ref={bind('ensSuffix')}
                          aria-label="Sufixo do nome ENS"
                          value={suffix.state.value}
                          onBlur={suffix.handleBlur}
                          onChange={(event) => suffix.handleChange(event.target.value)}
                          className={cn(controlClass, 'appearance-none pr-8 pl-2.5 text-[15px] leading-[15px]')}
                        >
                          {ENS_SUFFIXES.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <img src={arrowIcon} alt="" width={20} height={20} className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2" />
                      </div>
                    )}
                  </form.Field>
                  <input
                    ref={bind('ensName')}
                    id={`${idPrefix}-ens`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                    className={controlClass}
                  />
                </div>
              </Field>
            )}
          </form.Field>
        </div>
      </div>
      {banner && (
        <p role="alert" className="text-[13px] leading-4 text-coral">
          {banner}
        </p>
      )}
      {status && (
        <p role="status" className="text-[13px] leading-4 text-brand">
          {status}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-[131px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground disabled:opacity-60"
      >
        Salvar carteira
      </button>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label?: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex w-full max-w-[417px] shrink-0 flex-col gap-2.5">
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-[15px] leading-[15px]">
          {label}
          {required && (
            <span aria-hidden className="text-[22px] leading-[29px] text-coral">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error && <p className="text-[13px] leading-4 text-coral">{error}</p>}
    </div>
  )
}

function TextField({
  id,
  label,
  required,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  spellCheck,
  value,
  error,
  fieldRef,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  type?: 'text' | 'email'
  inputMode?: 'email'
  autoComplete?: string
  placeholder?: string
  spellCheck?: boolean
  value: string
  error?: string
  fieldRef: (node: HTMLInputElement | null) => void
  onBlur: () => void
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} required={required} error={error} htmlFor={id}>
      <input
        ref={fieldRef}
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        spellCheck={spellCheck}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        className={controlClass}
      />
    </Field>
  )
}

function SelectField({
  id,
  label,
  placeholder,
  required,
  value,
  error,
  options,
  fieldRef,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  required?: boolean
  value: string
  error?: string
  options: readonly { id: NetworkId | WalletId; label: string }[]
  fieldRef: (node: HTMLSelectElement | null) => void
  onBlur: () => void
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} required={required} error={error} htmlFor={id}>
      <div className="relative">
        <select
          ref={fieldRef}
          id={id}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          className={cn(controlClass, 'appearance-none pr-10', !value && 'text-tertiary')}
        >
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <img src={arrowIcon} alt="" width={20} height={20} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2" />
      </div>
    </Field>
  )
}

function SignedOut() {
  const navigate = useNavigate()
  return (
    <InlineAlert
      message="Entre para ver e editar as suas carteiras."
      action={{
        label: 'Entrar',
        onClick: () => {
          authIntent.set({ notice: 'Entre para ver as suas carteiras.' })
          void navigate({ to: '/wallets', search: { auth: 'login', redirect: '/wallets' } })
        },
      }}
    />
  )
}

function WalletsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-7 min-[1440px]:flex-row">
      <Skeleton className="h-12 w-full md:h-96 min-[1440px]:w-[310px]" />
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full max-w-[417px]" />
        <Skeleton className="h-10 w-full max-w-[417px]" />
        <Skeleton className="h-10 w-full max-w-[417px]" />
      </div>
    </div>
  )
}
