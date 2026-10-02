import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent } from 'react'
import imageIcon from '@/assets/figma/profile-image.svg'
import { SignInRequired } from '@/components/auth/sign-in-required'
import { AccountSidebar } from '@/components/profile/account-sidebar'
import { EnsField, PasswordField, TextField } from '@/components/ui/form-field'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogout, useSession } from '@/lib/api/auth'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { useCollectorProfile, useUpdateAvatar, useUpdateProfile } from '@/lib/api/profile'
import type { CollectorProfile, EnsSuffix } from '@/lib/api/types'
import { toSquareDataUrl } from '@/lib/image'
import { fieldProps, firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, profileFormSchema } from '@/lib/validation'

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

export function ProfileScreen() {
  const { user, isPending } = useSession()
  const profile = useCollectorProfile(user?.id)

  if (isPending || (user && profile.isPending)) return <ProfileSkeleton />
  if (!user) return <SignInRequired message="Entre para ver e editar os dados do seu perfil." notice="Entre para ver o seu perfil." path="/profile" />
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
  const updateAvatar = useUpdateAvatar(userId)
  const [avatarStatus, setAvatarStatus] = useState<{ message: string; error?: boolean }>()
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLSelectElement | null>>>({})
  const focus = (field?: FieldName) => field && refs.current[field]?.focus()

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

  const saveAvatar = async (image: string | null) => {
    try {
      await updateAvatar.mutateAsync(image)
      setAvatarStatus({ message: image ? 'Avatar atualizado.' : 'Avatar removido.' })
    } catch (error) {
      setAvatarStatus({ message: getErrorMessage(error), error: true })
    }
  }

  const onAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES.some((type) => type === file.type)) {
      setAvatarStatus({ message: 'Use uma imagem PNG, JPG ou WebP.', error: true })
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarStatus({ message: 'A imagem deve ter até 5 MB.', error: true })
      return
    }
    setAvatarStatus(undefined)
    const image = await toSquareDataUrl(file).catch(() => undefined)
    if (!image) {
      setAvatarStatus({ message: 'Não foi possível ler esta imagem. Tente outra.', error: true })
      return
    }
    await saveAvatar(image)
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
              {(field) => <TextField id="profile-display-name" label="Nome de exibição" required autoComplete="nickname" inputRef={bind('displayName')} {...fieldProps(field)} />}
            </form.Field>
            <form.Field name="username">
              {(field) => <TextField id="profile-username" label="Nome de usuário" required autoComplete="username" inputRef={bind('username')} {...fieldProps(field)} />}
            </form.Field>
          </div>
          <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0">
            <form.Field name="email">
              {(field) => (
                <TextField id="profile-email" label="E-mail" required type="email" inputMode="email" autoComplete="email" inputRef={bind('email')} {...fieldProps(field)} />
              )}
            </form.Field>
            <form.Field name="ensName">
              {(name) => (
                <form.Field name="ensSuffix">
                  {(suffix) => (
                    <EnsField
                      id="profile-ens"
                      required
                      name={{ ...fieldProps(name), inputRef: bind('ensName') }}
                      suffix={{ ...fieldProps(suffix), selectRef: bind('ensSuffix') }}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col gap-6 min-[1440px]:flex-row min-[1440px]:justify-between min-[1440px]:gap-0">
            <form.Field name="walletNickname">
              {(field) => <TextField id="profile-wallet" label="Apelido da carteira" required autoComplete="off" inputRef={bind('walletNickname')} {...fieldProps(field)} />}
            </form.Field>
            <div role="group" aria-labelledby="profile-avatar-label" className="flex w-full max-w-[417px] shrink-0 flex-col gap-2.5">
              <span id="profile-avatar-label" className="text-[15px] leading-[15px]">
                Avatar
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-6" aria-busy={updateAvatar.isPending}>
                  <span
                    className={cn(
                      'grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised',
                      profile.avatarUrl ? '' : 'p-3',
                    )}
                  >
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Seu avatar" width={50} height={50} className="size-full object-cover" />
                    ) : (
                      <img src={imageIcon} alt="" width={20} height={20} />
                    )}
                  </span>
                  <div className="flex items-center gap-5">
                    {/* The label is the visible control; focus lands on the (visually hidden) input, so the ring follows it. */}
                    <label
                      className={cn(
                        'grid h-10 w-[98px] cursor-pointer place-items-center rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary',
                        updateAvatar.isPending && 'cursor-wait opacity-60',
                      )}
                    >
                      Alterar
                      <input
                        type="file"
                        accept={AVATAR_TYPES.join(',')}
                        aria-label="Alterar avatar"
                        aria-describedby={avatarStatus ? 'profile-avatar-status' : undefined}
                        disabled={updateAvatar.isPending}
                        className="sr-only"
                        onChange={(event) => void onAvatar(event)}
                      />
                    </label>
                    <button
                      type="button"
                      aria-label="Remover avatar"
                      disabled={!profile.avatarUrl || updateAvatar.isPending}
                      onClick={() => void saveAvatar(null)}
                      className="text-sm leading-4 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <p
                  id="profile-avatar-status"
                  role={avatarStatus?.error ? 'alert' : 'status'}
                  className={cn('text-[13px] leading-4', avatarStatus?.error ? 'text-coral' : 'text-brand')}
                >
                  {avatarStatus?.message}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-base leading-4 font-medium">Alterar senha</h2>
          <form.Field name="currentPassword">
            {(field) => <PasswordField id="profile-current-password" label="Senha atual" autoComplete="current-password" inputRef={bind('currentPassword')} {...fieldProps(field)} />}
          </form.Field>
          <form.Field name="newPassword">
            {(field) => <PasswordField id="profile-new-password" label="Nova senha" autoComplete="new-password" inputRef={bind('newPassword')} {...fieldProps(field)} />}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => <PasswordField id="profile-confirm-password" label="Confirmar nova senha" autoComplete="new-password" inputRef={bind('confirmPassword')} {...fieldProps(field)} />}
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
