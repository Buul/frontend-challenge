import { useSearch } from '@tanstack/react-router'
import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import closeIcon from '@/assets/figma/auth-close.svg'
import hideIconMobile from '@/assets/figma/auth-hide-mobile.svg'
import hideIcon from '@/assets/figma/auth-hide.svg'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/use-media-query'
import { useLogin } from '@/lib/api/auth'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { authIntent, getReturnFocus, useAuthDialog } from '@/lib/auth/auth-dialog'
import { cn } from '@/lib/utils'
import { EMAIL_PATTERN } from '@/lib/validation'
import { FacebookIcon, GoogleIcon } from './social-icons'

const DESCRIPTION = 'Entre para gerenciar sua carteira, coleção e perfil de criador.'

// Actions drawn in the design that have no backend in this challenge; they explain that instead of pretending to work.
const UNAVAILABLE = {
  signup: 'O cadastro ainda não está disponível nesta versão.',
  forgot: 'A recuperação de senha ainda não está disponível nesta versão.',
  google: 'O login com Google não está disponível nesta demonstração. Use e-mail e senha.',
  facebook: 'O login com Facebook não está disponível nesta demonstração. Use e-mail e senha.',
} as const

type Field = 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Informe um e-mail válido, como nome@exemplo.com.'
  if (!password) errors.password = 'Informe sua senha.'
  return errors
}

export function LoginDialog() {
  const { auth } = useSearch({ strict: false })
  const { close } = useAuthDialog()
  const isMobile = useIsMobile()

  return (
    <Dialog open={auth === 'login'} onOpenChange={(open) => !open && close()}>
      <DialogContent
        finalFocus={getReturnFocus}
        className={cn(
          'overflow-y-auto',
          isMobile
            ? 'inset-0 h-dvh max-h-none w-full max-w-none translate-0 rounded-none bg-background'
            : 'w-[500px] max-w-[calc(100vw-2rem)] rounded-none bg-card',
        )}
      >
        <LoginForm isMobile={isMobile} />
      </DialogContent>
    </Dialog>
  )
}

function LoginForm({ isMobile }: { isMobile: boolean }) {
  const { redirect } = useSearch({ strict: false })
  const { close, closeTo } = useAuthDialog()
  const { notice } = useSyncExternalStore(authIntent.subscribe, authIntent.get)
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [info, setInfo] = useState<string>()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const formError = login.error && !(login.error instanceof ApiError && login.error.code === 'VALIDATION_ERROR') ? getErrorMessage(login.error) : undefined

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (login.isPending) return
    setInfo(undefined)
    const errors = validate(email, password)
    setFieldErrors(errors)
    if (errors.email) return emailRef.current?.focus()
    if (errors.password) return passwordRef.current?.focus()

    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          const { onAuthenticated } = authIntent.get()
          if (redirect) closeTo(redirect)
          else close()
          onAuthenticated?.()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
            setFieldErrors(error.fieldErrors)
            ;(error.fieldErrors.email ? emailRef : passwordRef).current?.focus()
            return
          }
          // Wrong credentials: keep the e-mail, clear the password and let the user retype it.
          if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
            setPassword('')
            passwordRef.current?.focus()
          }
        },
      },
    )
  }

  const clearError = (field: Field) => setFieldErrors(({ [field]: _cleared, ...rest }) => rest)

  const inputClass = cn(
    'w-full border border-border bg-transparent px-4 text-base leading-4 text-foreground outline-none transition-colors placeholder:text-sm placeholder:text-tertiary focus-visible:border-primary focus-visible:outline-none aria-invalid:border-coral',
    isMobile ? 'h-[50px] rounded-[10px]' : 'h-10 rounded-[5px]',
  )

  const messages = (
    <>
      {notice && (
        <p role="status" className="w-full rounded-[5px] border border-primary/60 bg-primary/10 px-4 py-3 text-[13px] leading-4">
          {notice}
        </p>
      )}
      <p role="status" className="w-full text-[13px] leading-4 text-muted-foreground empty:hidden">
        {info}
      </p>
    </>
  )

  const form = (
    <form noValidate onSubmit={onSubmit} aria-busy={login.isPending} className="flex w-full flex-col">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="sr-only">
            E-mail
          </label>
          <input
            ref={emailRef}
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            placeholder="contato@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearError('email')
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            className={inputClass}
          />
          <FieldError id="login-email-error">{fieldErrors.email}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="sr-only">
            Senha
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Senha"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              className={cn(inputClass, 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label="Mostrar senha"
              aria-pressed={showPassword}
              aria-controls="login-password"
              className={cn(
                'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-[5px] transition-opacity',
                showPassword ? 'opacity-50' : 'hover:opacity-80',
              )}
            >
              {isMobile ? (
                <img src={hideIconMobile} alt="" width={15.38} height={13.33} />
              ) : (
                <img src={hideIcon} alt="" width={18.98} height={14.65} />
              )}
            </button>
          </div>
          <FieldError id="login-password-error">{fieldErrors.password}</FieldError>
        </div>

        <button
          type="button"
          onClick={() => setInfo(UNAVAILABLE.forgot)}
          className="self-end rounded-sm text-sm leading-4 text-brand hover:underline"
        >
          Esqueceu a senha?
        </button>
      </div>

      <div className={cn('flex flex-col gap-3', isMobile ? 'pt-10' : 'pt-6')}>
        {formError && (
          <p role="alert" className="text-[13px] leading-4 text-coral">
            {formError}
          </p>
        )}
        <button
          type="submit"
          aria-disabled={login.isPending || undefined}
          className={cn(
            'flex w-full items-center justify-center bg-primary text-base leading-4 font-bold text-primary-foreground transition-colors hover:bg-primary/85 aria-disabled:cursor-progress aria-disabled:opacity-70',
            isMobile ? 'h-[60px] rounded-[10px]' : 'h-[45px] rounded-[5px]',
          )}
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </form>
  )

  const social = (
    <div className={cn('flex w-full flex-col', isMobile ? 'gap-3' : 'gap-3 pt-6')}>
      <div className={cn('flex items-center text-[13px] leading-4', isMobile ? 'gap-2.5' : 'gap-3')}>
        <span aria-hidden className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <div className={cn('flex flex-col', isMobile ? 'gap-4' : 'gap-3 px-20')}>
        <SocialButton icon={<GoogleIcon />} onClick={() => setInfo(UNAVAILABLE.google)}>
          Continuar com Google
        </SocialButton>
        <SocialButton icon={<FacebookIcon />} onClick={() => setInfo(UNAVAILABLE.facebook)}>
          Continuar com Facebook
        </SocialButton>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="relative flex min-h-full flex-col items-center gap-10 px-7 pt-20 pb-6">
        <CloseButton className="top-6 right-6" />
        <p aria-hidden className="flex h-[136px] items-center text-[32px] font-bold tracking-[3.2px]">
          KURIO
        </p>
        <DialogTitle className="text-xl leading-4 font-bold">Entrar</DialogTitle>
        <DialogDescription className="sr-only">{DESCRIPTION}</DialogDescription>
        <div className="flex w-full flex-col gap-10">
          {messages}
          {form}
          {social}
        </div>
        <p className="text-[15px] text-muted-foreground">
          Novo na Kurio?{' '}
          <button type="button" onClick={() => setInfo(UNAVAILABLE.signup)} className="rounded-sm hover:text-brand">
            Crie uma conta
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[600px] flex-col">
      <CloseButton className="top-1 right-[5px]" />
      <div className="flex flex-col items-center gap-10 px-12 pt-12">
        <div className="flex items-stretch gap-2 text-xl leading-4 font-medium">
          <DialogTitle className="text-xl leading-4 font-medium text-brand">Entrar</DialogTitle>
          <span aria-hidden className="w-px bg-coral" />
          <button type="button" onClick={() => setInfo(UNAVAILABLE.signup)} className="rounded-sm hover:text-brand">
            Criar conta
          </button>
        </div>
        <DialogDescription className="text-center text-[13px] leading-4">{DESCRIPTION}</DialogDescription>
      </div>
      <div className="flex flex-col gap-3 px-20 pt-6">
        {messages}
        {form}
      </div>
      {social}
      <div aria-hidden className="mt-auto h-2.5 shrink-0 bg-primary" />
    </div>
  )
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return (
    <p id={id} className="text-[13px] leading-4 text-coral">
      {children}
    </p>
  )
}

function SocialButton({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-muted-foreground transition-colors hover:border-primary"
    >
      {icon}
      {children}
    </button>
  )
}

function CloseButton({ className }: { className?: string }) {
  return (
    <DialogClose aria-label="Fechar" className={cn('absolute z-10 grid size-8 place-items-center rounded-sm hover:opacity-80', className)}>
      <img src={closeIcon} alt="" width={18} height={18} />
    </DialogClose>
  )
}
