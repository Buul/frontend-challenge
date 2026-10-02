import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import radioIcon from '@/assets/figma/wallet-radio.svg'
import { SignInRequired } from '@/components/auth/sign-in-required'
import { AccountSidebar } from '@/components/profile/account-sidebar'
import { EnsField, SelectField, TextField } from '@/components/ui/form-field'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogout, useSession } from '@/lib/api/auth'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { NETWORKS, WALLETS, type CollectorWallet, type CollectorWallets, type EnsSuffix } from '@/lib/api/types'
import { useCollectorWallets, useUpdateWallets } from '@/lib/api/wallets'
import { fieldProps, firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
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
  if (!user) return <SignInRequired message="Entre para ver e editar as suas carteiras." notice="Entre para ver as suas carteiras." path="/wallets" />
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
              <TextField id={`${idPrefix}-display-name`} label="Nome de exibição" required autoComplete="nickname" inputRef={bind('displayName')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="walletNickname">
            {(field) => <TextField id={`${idPrefix}-nickname`} label="Apelido da carteira" required inputRef={bind('walletNickname')} {...fieldProps(field)} />}
          </form.Field>
        </div>
        <div className={rowClass}>
          <form.Field name="network">
            {(field) => (
              <SelectField id={`${idPrefix}-network`} label="Rede" placeholder="Selecione uma rede" required options={NETWORKS} selectRef={bind('network')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="profileName">
            {(field) => <TextField id={`${idPrefix}-profile-name`} label="Nome do perfil" required inputRef={bind('profileName')} {...fieldProps(field)} />}
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
                inputRef={bind('walletAddress')}
                {...fieldProps(field)}
              />
            )}
          </form.Field>
          <form.Field name="secondaryAddress">
            {(field) => (
              <TextField
                id={`${idPrefix}-secondary-address`}
                ariaLabel="ENS ou carteira secundária (opcional)"
                placeholder="ENS ou carteira secundária (opcional)"
                spellCheck={false}
                autoComplete="off"
                inputRef={bind('secondaryAddress')}
                {...fieldProps(field)}
              />
            )}
          </form.Field>
        </div>
        <div className={rowClass}>
          <form.Field name="walletType">
            {(field) => (
              <SelectField id={`${idPrefix}-type`} label="Tipo de carteira" placeholder="Selecione uma carteira" required options={WALLETS} selectRef={bind('walletType')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="referralCode">
            {(field) => <TextField id={`${idPrefix}-referral`} label="Código de indicação" required autoComplete="off" inputRef={bind('referralCode')} {...fieldProps(field)} />}
          </form.Field>
        </div>
        <div className={rowClass}>
          <form.Field name="email">
            {(field) => (
              <TextField id={`${idPrefix}-email`} label="E-mail" required type="email" inputMode="email" autoComplete="email" inputRef={bind('email')} {...fieldProps(field)} />
            )}
          </form.Field>
          <form.Field name="ensName">
            {(name) => (
              <form.Field name="ensSuffix">
                {(suffix) => (
                  <EnsField
                    id={`${idPrefix}-ens`}
                    required
                    name={{ ...fieldProps(name), inputRef: bind('ensName') }}
                    suffix={{ ...fieldProps(suffix), selectRef: bind('ensSuffix') }}
                  />
                )}
              </form.Field>
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
