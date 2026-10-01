import { useForm } from '@tanstack/react-form'
import { useRef, useState, type RefObject } from 'react'
import { useSignup } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/errors'
import { useCompleteAuth } from '@/lib/auth/auth-dialog'
import { firstInvalidField, formErrorMessage, handleAuthSubmit, setServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { signupFormSchema } from '@/lib/validation'
import { AuthLayout, AuthMessages, FormAuthField, FormError, MobileModeSwitch, SubmitButton, type AuthFieldProps } from './auth-form-parts'

const DESCRIPTION = 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'

const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const
type Field = (typeof FIELDS)[number]

const isFieldError = (error: unknown): error is ApiError => error instanceof ApiError && (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT')

export function SignupForm({ isMobile }: { isMobile: boolean }) {
  const signup = useSignup()
  const completeAuth = useCompleteAuth()
  const [info, setInfo] = useState<string>()
  const refs: Record<Field, RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  }
  const focus = (field?: Field) => field && refs[field].current?.focus()

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    validators: { onSubmit: signupFormSchema },
    onSubmitInvalid: ({ formApi }) => focus(firstInvalidField(formApi, FIELDS)),
    onSubmit: async ({ value, formApi }) => {
      const { confirmPassword: _confirm, ...input } = signupFormSchema.parse(value)
      try {
        await signup.mutateAsync(input)
        completeAuth()
      } catch (error) {
        if (isFieldError(error)) focus(setServerErrors(formApi, FIELDS, error.fieldErrors))
      }
    },
  })

  const renderField = (name: Field, props: Omit<AuthFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'isMobile'>) => (
    <form.Field name={name}>{(field) => <FormAuthField field={field} fieldRef={refs[name]} isMobile={isMobile} {...props} />}</form.Field>
  )

  const fields = (
    <div className="flex flex-col gap-3">
      {renderField('name', { id: 'signup-name', label: 'Nome de usuário', autoComplete: 'nickname', autoFocus: true, placeholder: 'Nome de usuário' })}
      {renderField('email', {
        id: 'signup-email',
        label: 'E-mail',
        type: 'email',
        inputMode: 'email',
        autoComplete: 'email',
        placeholder: 'Digite seu e-mail',
      })}
      {renderField('password', {
        id: 'signup-password',
        label: 'Senha',
        type: 'password',
        revealable: true,
        autoComplete: 'new-password',
        placeholder: 'Senha',
      })}
      {renderField('confirmPassword', {
        id: 'signup-confirm-password',
        label: 'Confirmar senha',
        type: 'password',
        revealable: isMobile,
        revealLabel: 'Mostrar confirmação de senha',
        autoComplete: 'new-password',
        placeholder: 'Confirmar senha',
      })}
    </div>
  )

  const submit = (
    <div className={cn('flex flex-col gap-3', isMobile ? 'pt-10' : 'px-20 pt-6')}>
      <FormError>{formErrorMessage(signup.error, ['VALIDATION_ERROR', 'CONFLICT'])}</FormError>
      <SubmitButton isMobile={isMobile} pending={signup.isPending}>
        {signup.isPending ? 'Criando…' : isMobile ? 'Criar perfil' : 'Criar conta'}
      </SubmitButton>
    </div>
  )

  const body = isMobile ? (
    <>
      <AuthMessages info={info} />
      <form
        noValidate
        onSubmit={(event) => handleAuthSubmit(event, signup.isPending, () => form.handleSubmit(), () => setInfo(undefined))}
        aria-busy={signup.isPending}
        className="flex w-full flex-col"
      >
        {fields}
        {submit}
      </form>
    </>
  ) : (
    <form
      noValidate
      onSubmit={(event) => handleAuthSubmit(event, signup.isPending, () => form.handleSubmit(), () => setInfo(undefined))}
      aria-busy={signup.isPending}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-3 px-20 pt-6">
        <AuthMessages info={info} />
        {fields}
      </div>
      {submit}
    </form>
  )

  return (
    <AuthLayout
      isMobile={isMobile}
      mode="signup"
      mobileTitle="Criar perfil de colecionador"
      description={DESCRIPTION}
      onInfo={setInfo}
      socialClassName={isMobile ? 'gap-3' : 'gap-4 pt-6'}
      socialButtonsClassName={isMobile ? 'gap-4' : 'gap-4 px-20'}
      minHeight="min-h-[656px]"
      footer={<MobileModeSwitch to="login" prompt="Já tem uma conta?" action="Entre" />}
    >
      {body}
    </AuthLayout>
  )
}
