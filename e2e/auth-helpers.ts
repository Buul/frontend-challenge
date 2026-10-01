import { expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { name: 'Ana Souza', email: 'ana@kurio.dev', password: 'Kurio@123' },
  bruno: { name: 'Bruno Lima', email: 'bruno@kurio.dev', password: 'Kurio@456' },
} as const

export type TestUser = { name: string; email: string; password: string }

/** Fills and submits the login dialog, which must already be open. */
export async function signIn(page: Page, user: TestUser) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** Switches the open login dialog to signup ("Criar conta" tab on desktop, "Crie uma conta" link on mobile). */
export const switchToSignup = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: /^Cri(ar|e uma) conta$/ }).click()

/** Switches the open signup dialog back to login ("Entrar" tab on desktop, "Entre" link on mobile). */
export const switchToLogin = (page: Page) => page.getByRole('dialog').getByRole('button', { name: /^Entr(ar|e)$/ }).click()

/** Fills and submits the signup dialog, which must already be open; the button reads "Criar perfil" on mobile. */
export async function fillSignup(page: Page, user: TestUser, confirmPassword = user.password) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nome de usuário').fill(user.name)
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByLabel('Confirmar senha', { exact: true }).fill(confirmPassword)
  await submitSignup(page)
}

export const submitSignup = (page: Page) => page.getByRole('dialog').getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()

/** Opens `path` with the login dialog through its direct link and signs in. */
export async function signInAt(page: Page, path: string, user: TestUser) {
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}auth=login`)
  await signIn(page, user)
  await expect(page).not.toHaveURL(/auth=login/)
}

/** Opens the account control of the current layout (header on desktop, tab bar on mobile). */
export const accountButton = (page: Page, user: TestUser) => page.getByRole('button', { name: `Conta de ${user.name}` })
