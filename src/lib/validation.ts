import { z } from 'zod'
import { ENS_SUFFIXES, NETWORKS, WALLETS } from '@/lib/api/types'

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

const nftId = z.string({ error: 'Informe o NFT.' }).trim().min(1, 'Informe o NFT.').max(64)
const editionId = z
  .string({ error: 'Informe a edição.' })
  .trim()
  .regex(/^[\w-]{1,32}$/, 'Edição inválida.')

export const cartItemSchema = z.object({
  nftId,
  editionId,
  quantity: z.number({ error: 'Informe a quantidade.' }).int().min(1, 'A quantidade deve ser pelo menos 1.').max(99),
})

export const cartQuantitySchema = cartItemSchema.extend({
  quantity: z.number({ error: 'Informe a quantidade.' }).int().min(0).max(99),
})

const oneOf = (ids: readonly string[], message: string) =>
  z
    .string({ error: message })
    .min(1, { error: message, abort: true })
    .refine((value) => ids.includes(value), message)

const WALLET_ADDRESS = /^(0x[a-fA-F0-9]{40}|[a-z0-9-]+(\.[a-z0-9-]+)*\.(eth|sol))$/

const displayName = z
  .string({ error: 'Informe o nome de exibição.' })
  .trim()
  .min(1, { error: 'Informe o nome de exibição.', abort: true })
  .min(2, 'Use de 2 a 40 caracteres no nome de exibição.')
  .max(40, 'Use de 2 a 40 caracteres no nome de exibição.')

const ensName = z
  .string({ error: 'Informe o nome ENS.' })
  .trim()
  .min(1, { error: 'Informe o nome ENS.', abort: true })
  .regex(/^[\p{L}\d-]{2,32}$/u, 'Use de 2 a 32 letras, números ou hífen.')

const ensSuffix = oneOf(ENS_SUFFIXES.map(({ id }) => id), 'Selecione o sufixo ENS.')

const walletNickname = z
  .string({ error: 'Informe o apelido da carteira.' })
  .trim()
  .min(1, { error: 'Informe o apelido da carteira.', abort: true })
  .min(2, 'Use de 2 a 40 caracteres no apelido da carteira.')
  .max(40, 'Use de 2 a 40 caracteres no apelido da carteira.')

/** Body of `POST /orders`. The desktop form collects the profile; mobile sends the signed-in collector and the chosen wallet. */
export const checkoutSchema = z.object({
  displayName,
  username,
  network: oneOf(NETWORKS.map(({ id }) => id), 'Selecione uma rede.'),
  profileName: z
    .string({ error: 'Informe o nome do perfil.' })
    .trim()
    .min(1, { error: 'Informe o nome do perfil.', abort: true })
    .min(2, 'Use de 2 a 40 caracteres no nome do perfil.')
    .max(40, 'Use de 2 a 40 caracteres no nome do perfil.'),
  walletAddress: z
    .string({ error: 'Informe o endereço da carteira.' })
    .trim()
    .min(1, { error: 'Informe o endereço da carteira.', abort: true })
    .regex(WALLET_ADDRESS, 'Informe um endereço 0x ou um nome ENS, como nome.eth.'),
  secondaryWallet: z.string().trim().max(80, 'Use até 80 caracteres na carteira secundária.'),
  walletType: oneOf(WALLETS.map(({ id }) => id), 'Selecione uma carteira.'),
  referralCode: z
    .string({ error: 'Informe o código de indicação.' })
    .trim()
    .min(1, { error: 'Informe o código de indicação.', abort: true })
    .max(32, 'Use até 32 caracteres no código.')
    .regex(/^[A-Za-z0-9]+$/, 'Use só letras e números no código.'),
  email,
  ensName,
  ensSuffix,
  useOtherWallet: z.boolean(),
  notes: z.string().trim().max(280, 'Use até 280 caracteres na observação.'),
})

/** Body of `PUT /auth/wallets` when saving the primary or secondary wallet. */
export const walletSchema = z.object({
  displayName,
  walletNickname,
  network: oneOf(NETWORKS.map(({ id }) => id), 'Selecione uma rede.'),
  profileName: z
    .string({ error: 'Informe o nome do perfil.' })
    .trim()
    .min(1, { error: 'Informe o nome do perfil.', abort: true })
    .min(2, 'Use de 2 a 40 caracteres no nome do perfil.')
    .max(40, 'Use de 2 a 40 caracteres no nome do perfil.'),
  walletAddress: z
    .string({ error: 'Informe o endereço da carteira.' })
    .trim()
    .min(1, { error: 'Informe o endereço da carteira.', abort: true })
    .regex(WALLET_ADDRESS, 'Informe um endereço 0x ou um nome ENS, como nome.eth.'),
  secondaryAddress: z.string().trim().max(80, 'Use até 80 caracteres na carteira secundária.'),
  walletType: oneOf(WALLETS.map(({ id }) => id), 'Selecione uma carteira.'),
  referralCode: z
    .string({ error: 'Informe o código de indicação.' })
    .trim()
    .min(1, { error: 'Informe o código de indicação.', abort: true })
    .max(32, 'Use até 32 caracteres no código.')
    .regex(/^[A-Za-z0-9]+$/, 'Use só letras e números no código.'),
  email,
  ensName,
  ensSuffix,
})

/** Body of `PATCH /auth/profile`. An empty password pair means the password stays as it is. */
export const profileSchema = z.object({
  displayName,
  username,
  email,
  ensName,
  ensSuffix,
  walletNickname,
})

const passwordTouched = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return false
  const fields = value as { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown }
  return [fields.currentPassword, fields.newPassword, fields.confirmPassword].some(
    (field) => typeof field === 'string' && field.length > 0,
  )
}

const passwordRule = `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`

/** The profile form adds a password change that is checked only when one of the three fields is filled. */
export const profileFormSchema = profileSchema
  .extend({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => value.currentPassword !== '', {
    path: ['currentPassword'],
    error: 'Informe a senha atual.',
    when: ({ value }) => passwordTouched(value),
  })
  .refine((value) => newPassword.safeParse(value.newPassword).success, {
    path: ['newPassword'],
    error: passwordRule,
    when: ({ value }) => passwordTouched(value),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem.',
    when: ({ value }) => passwordTouched(value),
  })

export const profileUpdateSchema = profileSchema
  .extend({
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine((value) => !value.newPassword || Boolean(value.currentPassword), {
    path: ['currentPassword'],
    error: 'Informe a senha atual.',
  })
  .refine((value) => (!value.currentPassword && !value.newPassword) || newPassword.safeParse(value.newPassword ?? '').success, {
    path: ['newPassword'],
    error: passwordRule,
  })

export const cartPromoSchema = z.object({
  code: z
    .string({ error: 'Informe o código promocional.' })
    .trim()
    .min(1, { error: 'Informe o código promocional.', abort: true })
    .max(32, 'Use até 32 caracteres no código.')
    .regex(/^[A-Za-z0-9]+$/, 'Use só letras e números no código.'),
})

/** First message per field, in the `fieldErrors` shape the API answers with. */
export const toFieldErrors = (error: z.ZodError) =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors as Record<string, string[] | undefined>).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : [],
    ),
  )

/** Avatar images the profile accepts, before the client resizes them. */
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

/** `PUT /auth/profile/avatar`: a resized image as a base64 `data:` URL (about 20 kB at 256 px; capped to keep the mock store small). */
export const avatarSchema = z.object({
  image: z
    .string({ error: 'Envie uma imagem.' })
    .max(400_000, 'A imagem é grande demais. Use uma imagem menor.')
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, 'Use uma imagem PNG, JPG ou WebP.'),
})
