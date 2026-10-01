import { useState, useSyncExternalStore, type ComponentProps, type ReactNode, type RefObject } from 'react'
import closeIcon from '@/assets/figma/auth-close.svg'
import hideIconMobile from '@/assets/figma/auth-hide-mobile.svg'
import hideIcon from '@/assets/figma/auth-hide.svg'
import { DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { fieldError } from '@/lib/forms'
import { authIntent, useAuthDialog, type AuthMode } from '@/lib/auth/auth-dialog'
import { cn } from '@/lib/utils'
import { FacebookIcon, GoogleIcon } from './social-icons'

// Drawn in the design but without a backend in this challenge; the buttons explain that instead of pretending to work.
const SOCIAL_UNAVAILABLE = {
  google: 'O acesso com Google não está disponível nesta demonstração. Use e-mail e senha.',
  facebook: 'O acesso com Facebook não está disponível nesta demonstração. Use e-mail e senha.',
} as const

/** Why the user was asked to sign in (kept when switching to signup) and replies to unavailable actions. */
export function AuthMessages({ info }: { info?: string }) {
  const { notice } = useSyncExternalStore(authIntent.subscribe, authIntent.get)
  return (
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
}

export type AuthFieldProps = Omit<ComponentProps<'input'>, 'id' | 'className' | 'type'> & {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  error?: string
  isMobile: boolean
  /** Adds a show/hide toggle to a password field. */
  revealable?: boolean
  revealLabel?: string
}

export function AuthField({
  id,
  label,
  type = 'text',
  error,
  isMobile,
  revealable = false,
  revealLabel = `Mostrar ${label.toLowerCase()}`,
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full border border-border bg-transparent px-4 text-base leading-4 text-foreground outline-none transition-colors placeholder:text-sm placeholder:text-tertiary focus-visible:border-primary focus-visible:outline-none aria-invalid:border-coral',
            isMobile ? 'h-[50px] rounded-[10px]' : 'h-10 rounded-[5px]',
            revealable && 'pr-12',
          )}
          {...inputProps}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealLabel}
            aria-pressed={revealed}
            aria-controls={id}
            className={cn(
              'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-[5px] transition-opacity',
              revealed ? 'opacity-50' : 'hover:opacity-80',
            )}
          >
            {isMobile ? (
              <img src={hideIconMobile} alt="" width={15.38} height={13.33} />
            ) : (
              <img src={hideIcon} alt="" width={18.98} height={14.65} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] leading-4 text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p role="alert" className="text-[13px] leading-4 text-coral">
      {children}
    </p>
  )
}

export function SubmitButton({ isMobile, pending, children }: { isMobile: boolean; pending: boolean; children: string }) {
  return (
    <button
      type="submit"
      aria-disabled={pending || undefined}
      className={cn(
        'flex w-full items-center justify-center bg-primary text-base leading-4 font-bold text-primary-foreground transition-colors hover:bg-primary/85 aria-disabled:cursor-progress aria-disabled:opacity-70',
        isMobile ? 'h-[60px] rounded-[10px]' : 'h-[45px] rounded-[5px]',
      )}
    >
      {children}
    </button>
  )
}

/** "Ou continue com" divider and the Google/Facebook buttons; spacing differs between the login and signup frames. */
export function SocialSignIn({
  isMobile,
  onInfo,
  className,
  buttonsClassName,
}: {
  isMobile: boolean
  onInfo: (message: string) => void
  className?: string
  buttonsClassName?: string
}) {
  return (
    <div className={cn('flex w-full flex-col', className)}>
      <div className={cn('flex items-center text-[13px] leading-4', isMobile ? 'gap-2.5' : 'gap-3')}>
        <span aria-hidden className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <div className={cn('flex flex-col', buttonsClassName)}>
        <SocialButton icon={<GoogleIcon />} onClick={() => onInfo(SOCIAL_UNAVAILABLE.google)}>
          Continuar com Google
        </SocialButton>
        <SocialButton icon={<FacebookIcon />} onClick={() => onInfo(SOCIAL_UNAVAILABLE.facebook)}>
          Continuar com Facebook
        </SocialButton>
      </div>
    </div>
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

const MODE_LABELS: Record<AuthMode, string> = { login: 'Entrar', signup: 'Criar conta' }

/** Desktop "Entrar | Criar conta" header: the current mode is the dialog title, the other one switches to it. */
export function DesktopModeTabs({ mode }: { mode: AuthMode }) {
  const { switchTo } = useAuthDialog()
  const other: AuthMode = mode === 'login' ? 'signup' : 'login'
  const title = (
    <DialogTitle key="title" className="text-xl leading-4 font-medium text-brand">
      {MODE_LABELS[mode]}
    </DialogTitle>
  )
  const switcher = (
    <button key="switch" type="button" onClick={() => switchTo(other)} className="rounded-sm hover:text-brand">
      {MODE_LABELS[other]}
    </button>
  )

  return (
    <div className="flex items-stretch gap-2 text-xl leading-4 font-medium">
      {mode === 'login' ? title : switcher}
      <span aria-hidden className="w-px bg-coral" />
      {mode === 'login' ? switcher : title}
    </div>
  )
}

/** Mobile footer link to the other mode, e.g. "Novo na Kurio? Crie uma conta". */
export function MobileModeSwitch({ to, prompt, action }: { to: AuthMode; prompt: string; action: string }) {
  const { switchTo } = useAuthDialog()
  return (
    <p className="text-[15px] text-muted-foreground">
      {prompt}{' '}
      <button type="button" onClick={() => switchTo(to)} className="rounded-sm hover:text-brand">
        {action}
      </button>
    </p>
  )
}

export function MobileLogo() {
  return (
    <p aria-hidden className="flex h-[136px] items-center text-[32px] font-bold tracking-[3.2px]">
      KURIO
    </p>
  )
}

export function CloseButton({ className }: { className?: string }) {
  return (
    <DialogClose aria-label="Fechar" className={cn('absolute z-10 grid size-8 place-items-center rounded-sm hover:opacity-80', className)}>
      <img src={closeIcon} alt="" width={18} height={18} />
    </DialogClose>
  )
}

type FormFieldApi = {
  name: string
  state: { value: string; meta: { errors: readonly unknown[] } }
  handleChange: (value: string) => void
  handleBlur: () => void
}

export function FormAuthField({
  field,
  fieldRef,
  isMobile,
  ...props
}: {
  field: FormFieldApi
  fieldRef: RefObject<HTMLInputElement | null>
  isMobile: boolean
} & Omit<AuthFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'isMobile'>) {
  return (
    <AuthField
      ref={fieldRef}
      name={field.name}
      value={field.state.value}
      onChange={(event) => field.handleChange(event.target.value)}
      onBlur={field.handleBlur}
      error={fieldError(field.state.meta.errors)}
      isMobile={isMobile}
      {...props}
    />
  )
}

type AuthLayoutProps = {
  isMobile: boolean
  mode: AuthMode
  mobileTitle: string
  description: string
  onInfo: (message: string) => void
  socialClassName: string
  socialButtonsClassName: string
  minHeight?: string
  children: ReactNode
  footer?: ReactNode
}

/** Desktop modal chrome and mobile full-screen chrome shared by login and signup. */
export function AuthLayout({
  isMobile,
  mode,
  mobileTitle,
  description,
  onInfo,
  socialClassName,
  socialButtonsClassName,
  minHeight,
  children,
  footer,
}: AuthLayoutProps) {
  const social = <SocialSignIn isMobile={isMobile} onInfo={onInfo} className={socialClassName} buttonsClassName={socialButtonsClassName} />

  if (isMobile) {
    return (
      <div className="relative flex min-h-full flex-col items-center gap-10 px-7 pt-20 pb-6">
        <CloseButton className="top-6 right-6" />
        <MobileLogo />
        <DialogTitle className={cn('leading-4 font-bold', mode === 'signup' ? 'text-lg' : 'text-xl')}>{mobileTitle}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="flex w-full flex-col gap-10">
          {children}
          {social}
        </div>
        {footer}
      </div>
    )
  }

  return (
    <div className={cn('relative flex flex-col', minHeight)}>
      <CloseButton className="top-1 right-[5px]" />
      <div className="flex flex-col items-center gap-10 px-12 pt-12">
        <DesktopModeTabs mode={mode} />
        <DialogDescription className="text-center text-[13px] leading-4">{description}</DialogDescription>
      </div>
      {children}
      {social}
      <div aria-hidden className="mt-auto h-2.5 shrink-0 bg-primary" />
    </div>
  )
}
