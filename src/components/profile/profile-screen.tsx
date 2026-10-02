import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import hideIcon from '@/assets/figma/profile-hide.svg'
import imageIcon from '@/assets/figma/profile-image.svg'
import arrowIcon from '@/assets/figma/profile-arrow.svg'
import { AccountSidebar } from '@/components/profile/account-sidebar'
import { InlineAlert, RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogout, useSession } from '@/lib/api/auth'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { useCollectorProfile, useUpdateProfile } from '@/lib/api/profile'
import { ENS_SUFFIXES, type CollectorProfile, type EnsSuffix } from '@/lib/api/types'
import { authIntent } from '@/lib/auth/auth-dialog'
import { fieldError, firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { profileFormSchema } from '@/lib/validation'

const FIELDS = [
  'displayName',
  'username',
  'email',
  'ensSuffix',
  'ensName',
  'walletNickname',
  'currentPassword',
  'newPassword',
  'confirmPassword',
] as const

type FieldName = (typeof FIELDS)[number]

type ProfileValues = {
  displayName: string
  username: string
  email: string
  ensName: string
  ensSuffix: string
  walletNickname: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const controlClass =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-[15px] leading-[15px] text-foreground outline-none focus-visible:border-primary aria-invalid:border-coral'

export function ProfileScreen() {
  const { user, isPending } = useSession()
  const profile = useCollectorProfile(user?.id)

  if (isPending || (user && profile.isPending)) return <ProfileSkeleton />
  if (!user) return <SignedOut />
  if (!profile.data) {
    return (
      <RetryAlert
        message={<>Não foi possível carregar o perfil. {getErrorMessage(profile.error)}</>}
        onRetry={() => void profile.refetch()}
      />
    )
  }

  return <ProfileEditor userId={user.id} profile={profile.data} />
}

function ProfileEditor({ userId, profile }: { userId: string; profile: CollectorProfile }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const update = useUpdateProfile(userId)
  const [status, setStatus] = useState('')
  const [avatar, setAvatar] = useState<string>()
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLSelectElement | null>>>({})
  const focus = (field?: FieldName) => field && refs.current[field]?.focus()

  useEffect(() => {
    return () => {
      if (avatar) URL.revokeObjectURL(avatar)
    }
  }, [avatar])

  const form = useForm({
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      ensSuffix: profile.ensSuffix,
      walletNickname: profile.walletNickname,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    } as ProfileValues,
    validators: { onSubmit: profileFormSchema },
    onSubmitInvalid: ({ formApi }) => focus(firstInvalidField(formApi, FIELDS)),
    onSubmit: async ({ value, formApi }) => {
      const changing = value.currentPassword !== '' || value.newPassword !== '' || value.confirmPassword !== ''
      const ensSuffix: EnsSuffix = value.ensSuffix === 'sol' ? 'sol' : 'eth'
      try {
        await update.mutateAsync({
          displayName: value.displayName,
          username: value.username,
          email: value.email,
          ensName: value.ensName,
          ensSuffix,
          walletNickname: value.walletNickname,
          ...(changing ? { currentPassword: value.currentPassword, newPassword: value.newPassword } : {}),
        })
        formApi.setFieldValue('currentPassword', '')
        formApi.setFieldValue('newPassword', '')
        formApi.setFieldValue('confirmPassword', '')
        setStatus('Perfil salvo.')
      } catch (error) {
        if (!(error instanceof ApiError)) return
        if (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT') {
          focus(setServerErrors(formApi, FIELDS, error.fieldErrors))
        }
      }
    },
  })

  const bind = (field: FieldName) => (node: HTMLInputElement | HTMLSelectElement | null) => {
    refs.current[field] = node
  }

  const onAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setAvatar(URL.createObjectURL(file))
  }

  const onLogout = () => {
    logout.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) })
  }

  const banner = update.isError ? formErrorMessage(update.error, ['VALIDATION_ERROR', 'CONFLICT']) : undefined

  return (
    <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:items-start min-[1440px]:gap-7">
      <AccountSidebar active="profile" onLogout={onLogout} logoutPending={logout.isPending} />
      <form
        noValidate
        aria-busy={update.isPending}
        onSubmit={(event) => handleAuthSubmit(event, update.isPending, () => form.handleSubmit(), () => setStatus(''))}
        className="flex min-w-0 flex-1 flex-col gap-8"
      >
        <h1 className="text-base leading-4 font-bold">Perfil do colecionador</h1>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0">
            <form.Field name="displayName">
              {(field) => (
                <TextField
                  id="profile-display-name"
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
            <form.Field name="username">
              {(field) => (
                <TextField
                  id="profile-username"
                  label="Nome de usuário"
                  required
                  autoComplete="username"
                  fieldRef={bind('username')}
                  value={field.state.value}
                  error={fieldError(field.state.meta.errors)}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0">
            <form.Field name="email">
              {(field) => (
                <TextField
                  id="profile-email"
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
                <Field label="Nome ENS" required error={fieldError(field.state.meta.errors)} htmlFor="profile-ens">
                  <div className="flex w-full max-w-[417px] gap-2.5">
                    <form.Field name="ensSuffix">
                      {(suffix) => (
                        <div className="relative w-[78px] shrink-0">
                          <select
                            ref={bind('ensSuffix')}
                            aria-label="Sufixo do nome ENS"
                            value={suffix.state.value}
                            onBlur={suffix.handleBlur}
                            onChange={(event) => suffix.handleChange(event.target.value)}
                            className={cn(controlClass, 'appearance-none pr-8 pl-2.5')}
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
                      id="profile-ens"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={Boolean(fieldError(field.state.meta.errors)) || undefined}
                      className={cn(controlClass, 'min-w-0 flex-1')}
                    />
                  </div>
                </Field>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0">
            <form.Field name="walletNickname">
              {(field) => (
                <TextField
                  id="profile-wallet"
                  label="Apelido da carteira"
                  required
                  autoComplete="off"
                  fieldRef={bind('walletNickname')}
                  value={field.state.value}
                  error={fieldError(field.state.meta.errors)}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
            <Field label="Avatar">
              <div className="flex items-center gap-6">
                <span
                  className={cn(
                    'grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised',
                    avatar ? '' : 'p-3',
                  )}
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="size-full object-cover" />
                  ) : (
                    <img src={imageIcon} alt="" width={20} height={20} />
                  )}
                </span>
                <div className="flex items-center gap-5">
                  <label className="grid h-10 w-[98px] cursor-pointer place-items-center rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground">
                    Alterar
                    <input type="file" accept="image/*" className="sr-only" onChange={onAvatar} />
                  </label>
                  <button type="button" onClick={() => setAvatar(undefined)} className="text-sm leading-4">
                    Remover
                  </button>
                </div>
              </div>
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-base leading-4 font-medium">Alterar senha</h2>
          <form.Field name="currentPassword">
            {(field) => (
              <SecretField
                id="profile-current-password"
                label="Senha atual"
                autoComplete="current-password"
                fieldRef={bind('currentPassword')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="newPassword">
            {(field) => (
              <SecretField
                id="profile-new-password"
                label="Nova senha"
                autoComplete="new-password"
                fieldRef={bind('newPassword')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => (
              <SecretField
                id="profile-confirm-password"
                label="Confirmar nova senha"
                autoComplete="new-password"
                fieldRef={bind('confirmPassword')}
                value={field.state.value}
                error={fieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
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
          disabled={update.isPending}
          className="h-10 w-[131px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground disabled:opacity-60"
        >
          Salvar
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex w-full max-w-[417px] shrink-0 flex-col gap-2.5">
      <label htmlFor={htmlFor} className="flex items-center text-[15px] leading-[15px]">
        {label}
        {required && (
          <span aria-hidden className="text-[22px] leading-[29px] text-coral">
            *
          </span>
        )}
      </label>
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
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        className={controlClass}
      />
    </Field>
  )
}

function SecretField({
  id,
  label,
  autoComplete,
  value,
  error,
  fieldRef,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  autoComplete: string
  value: string
  error?: string
  fieldRef: (node: HTMLInputElement | null) => void
  onBlur: () => void
  onChange: (value: string) => void
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="flex w-full max-w-[417px] flex-col gap-3">
      <label htmlFor={id} className="text-[15px] leading-[15px]">
        {label}
      </label>
      <div className="relative">
        <input
          ref={fieldRef}
          id={id}
          type={revealed ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          className={cn(controlClass, 'pr-12')}
        />
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-label={revealed ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute top-1/2 right-4 -translate-y-1/2"
        >
          <img src={hideIcon} alt="" width={16.6667} height={14.3942} />
        </button>
      </div>
      {error && <p className="text-[13px] leading-4 text-coral">{error}</p>}
    </div>
  )
}

function SignedOut() {
  const navigate = useNavigate()
  return (
    <InlineAlert
      message="Entre para ver e editar os dados do seu perfil."
      action={{
        label: 'Entrar',
        onClick: () => {
          authIntent.set({ notice: 'Entre para ver o seu perfil.' })
          void navigate({ to: '/profile', search: { auth: 'login', redirect: '/profile' } })
        },
      }}
    />
  )
}

function ProfileSkeleton() {
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
