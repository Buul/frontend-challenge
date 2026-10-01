import { expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { name: 'Ana Souza', email: 'ana@kurio.dev', password: 'Kurio@123' },
  bruno: { name: 'Bruno Lima', email: 'bruno@kurio.dev', password: 'Kurio@456' },
} as const

export type TestUser = (typeof USERS)[keyof typeof USERS]

/** Fills and submits the login dialog, which must already be open. */
export async function signIn(page: Page, user: TestUser) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** Opens `path` with the login dialog through its direct link and signs in. */
export async function signInAt(page: Page, path: string, user: TestUser) {
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}auth=login`)
  await signIn(page, user)
  await expect(page).not.toHaveURL(/auth=login/)
}

/** Opens the account control of the current layout (header on desktop, tab bar on mobile). */
export const accountButton = (page: Page, user: TestUser) => page.getByRole('button', { name: `Conta de ${user.name}` })
