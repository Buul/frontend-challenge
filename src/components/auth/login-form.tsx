import { useForm } from '@tanstack/react-form'
import { useRef, useState } from 'react'
import { useLogin } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/errors'
import { useCompleteAuth } from '@/lib/auth/auth-dialog'
import { firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { loginSchema } from '@/lib/validation'
import { AuthLayout, AuthMessages, FormAuthField, FormError, MobileModeSwitch, SubmitButton } from './auth-form-parts'

const DESCRIPTION = 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
const FORGOT_UNAVAILABLE = 'A recuperação de senha ainda não está disponível nesta versão.'

const FIELDS = ['email', 'password'] as const
type Field = (typeof FIELDS)[number]

export function LoginForm({ isMobile }: { isMobile: boolean }) {
  const login = useLogin()
  const completeAuth = useCompleteAuth()
  const [info, setInfo] = useState<string>()
  const refs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) }
  const focus = (field?: Field) => field && refs[field].current?.focus()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmitInvalid: ({ formApi }) => focus(firstInvalidField(formApi, FIELDS)),
    onSubmit: async ({ value, formApi }) => {
      try {
        await login.mutateAsync(loginSchema.parse(value))
        completeAuth()
      } catch (error) {
        if (!(error instanceof ApiError)) return
        if (error.code === 'VALIDATION_ERROR') focus(setServerErrors(formApi, FIELDS, error.fieldErrors))
        if (error.code === 'UNAUTHENTICATED') {
          formApi.setFieldValue('password', '')
          focus('password')
        }
      }
    },
  })

  const formBody = (
    <form
      noValidate
      onSubmit={(event) => handleAuthSubmit(event, login.isPending, () => form.handleSubmit(), () => setInfo(undefined))}
      aria-busy={login.isPending}
      className="flex w-full flex-col"
    >
      <div className="flex flex-col gap-3">
        <form.Field name="email">
          {(field) => (
            <FormAuthField
              field={field}
              fieldRef={refs.email}
              isMobile={isMobile}
              id="login-email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              placeholder="contato@email.com"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FormAuthField
              field={field}
              fieldRef={refs.password}
              isMobile={isMobile}
              id="login-password"
              label="Senha"
              type="password"
              revealable
              autoComplete="current-password"
              placeholder="Senha"
            />
          )}
        </form.Field>
        <button type="button" onClick={() => setInfo(FORGOT_UNAVAILABLE)} className="self-end rounded-sm text-sm leading-4 text-brand hover:underline">
          Esqueceu a senha?
        </button>
      </div>
      <div className={cn('flex flex-col gap-3', isMobile ? 'pt-10' : 'pt-6')}>
        <FormError>{formErrorMessage(login.error)}</FormError>
        <SubmitButton isMobile={isMobile} pending={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </SubmitButton>
      </div>
    </form>
  )

  return (
    <AuthLayout
      isMobile={isMobile}
      mode="login"
      mobileTitle="Entrar"
      description={DESCRIPTION}
      onInfo={setInfo}
      socialClassName={isMobile ? 'gap-3' : 'gap-3 pt-6'}
      socialButtonsClassName={isMobile ? 'gap-4' : 'gap-3 px-20'}
      minHeight="min-h-[600px]"
      footer={<MobileModeSwitch to="signup" prompt="Novo na Kurio?" action="Crie uma conta" />}
    >
      {isMobile ? (
        <>
          <AuthMessages info={info} />
          {formBody}
        </>
      ) : (
        <div className="flex flex-col gap-3 px-20 pt-6">
          <AuthMessages info={info} />
          {formBody}
        </div>
      )}
    </AuthLayout>
  )
}
