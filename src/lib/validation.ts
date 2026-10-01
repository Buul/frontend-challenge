import { z } from 'zod'

/** Shared by the forms and the mock API so both sides agree on what valid input is. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USERNAME_LENGTH = { min: 2, max: 40 } as const
export const PASSWORD_MIN_LENGTH = 8

// `abort` stops at the "required" message so an empty field doesn't also report its format rules.
const email = z
  .string({ error: 'Informe seu e-mail.' })
  .trim()
  .min(1, { error: 'Informe seu e-mail.', abort: true })
  .regex(EMAIL_PATTERN, 'Informe um e-mail válido, como nome@exemplo.com.')

const usernameLengthMessage = `Use de ${USERNAME_LENGTH.min} a ${USERNAME_LENGTH.max} caracteres no nome de usuário.`
const username = z
  .string({ error: 'Informe seu nome de usuário.' })
  .trim()
  .min(1, { error: 'Informe seu nome de usuário.', abort: true })
  .min(USERNAME_LENGTH.min, usernameLengthMessage)
  .max(USERNAME_LENGTH.max, usernameLengthMessage)

const newPassword = z
  .string({ error: 'Crie uma senha.' })
  .min(1, { error: 'Crie uma senha.', abort: true })
  .refine(
    (value) => value.length >= PASSWORD_MIN_LENGTH && /\p{L}/u.test(value) && /\d/.test(value),
    `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`,
  )

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe sua senha.' }).min(1, 'Informe sua senha.'),
})

/** Body of `POST /auth/register`. */
export const signupSchema = z.object({ name: username, email, password: newPassword })

/** The signup form adds a confirmation that never leaves the browser. */
export const signupFormSchema = signupSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme sua senha.') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem.',
    // Runs even when other fields are invalid, so a mismatch shows up together with the other errors.
    when: ({ value }) => {
      const { confirmPassword } = value as { confirmPassword?: unknown }
      return typeof confirmPassword === 'string' && confirmPassword !== ''
    },
  })

/** First message per field, in the `fieldErrors` shape the API answers with. */
export const toFieldErrors = (error: z.ZodError) =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors as Record<string, string[] | undefined>).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : [],
    ),
  )
