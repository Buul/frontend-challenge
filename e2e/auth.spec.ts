import { expect, test, type Page } from '@playwright/test'
import { accountButton, signIn, signInAt, USERS } from './auth-helpers.ts'

const openLogin = (page: Page) => page.getByRole('button', { name: 'Entrar', exact: true }).first().click()

async function signOut(page: Page, user: (typeof USERS)[keyof typeof USERS]) {
  await accountButton(page, user).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Entrar', exact: true }).first()).toBeVisible()
}

test('login valida os campos, informa credenciais inválidas e mantém a página atual', async ({ page }) => {
  await page.goto('/?tab=new')
  await openLogin(page)
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(dialog.getByLabel('E-mail')).toBeFocused()

  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription('Informe seu e-mail.')
  await expect(dialog.getByLabel('Senha', { exact: true })).toHaveAccessibleDescription('Informe sua senha.')
  await expect(dialog.getByLabel('E-mail')).toBeFocused()

  await dialog.getByLabel('E-mail').fill('ana@kurio')
  await dialog.getByLabel('Senha', { exact: true }).fill('qualquer')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription(/e-mail válido/)

  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  await expect(dialog.getByLabel('Senha', { exact: true })).toHaveValue('')
  await expect(dialog.getByLabel('Senha', { exact: true })).toBeFocused()

  await signIn(page, USERS.ana)
  await expect(page).toHaveURL(/\/\?tab=new$/)
  await expect(accountButton(page, USERS.ana)).toBeVisible()
})

test('sessão sobrevive ao refresh e logout limpa a sessão', async ({ page }) => {
  await signInAt(page, '/', USERS.ana)
  await page.reload()
  await expect(accountButton(page, USERS.ana)).toBeVisible()

  await signOut(page, USERS.ana)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Entrar', exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()
})

test('troca de usuário não mostra favoritos do usuário anterior', async ({ page }) => {
  await signInAt(page, '/nfts/nft-1', USERS.ana)
  const favorite = page.getByRole('button', { name: 'Favoritar' })
  await favorite.click()
  await expect(page.getByText('Emerald Ape #042 foi adicionado aos favoritos.')).toBeVisible()

  await page.goto('/')
  await signOut(page, USERS.ana)
  await signInAt(page, '/nfts/nft-1', USERS.bruno)
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')

  await page.goto('/')
  await signOut(page, USERS.bruno)
  await signInAt(page, '/nfts/nft-1', USERS.ana)
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('sessão expirada pede novo login e retoma a ação no mesmo lugar', async ({ page }) => {
  await signInAt(page, '/nfts/nft-2?edition=1-50', USERS.ana)
  // The server forgets every session, as if they had expired.
  await page.evaluate(() => localStorage.removeItem('kurio:mock:sessions'))

  const favorite = page.getByRole('button', { name: 'Favoritar' })
  await favorite.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Sua sessão expirou')

  await signIn(page, USERS.ana)
  await expect(page).toHaveURL(/\/nfts\/nft-2\?edition=1-50$/)
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('link direto abre o login e redireciona só para caminhos internos', async ({ page }) => {
  await page.goto('/?auth=login&redirect=%2Fnfts%2Fnft-3')
  await signIn(page, USERS.bruno)
  await expect(page).toHaveURL(/\/nfts\/nft-3$/)

  await page.goto('/')
  await signOut(page, USERS.bruno)
  await page.goto('/?auth=login&redirect=%2F%2Fexample.com')
  await signIn(page, USERS.bruno)
  await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/)
})

test('fechar o diálogo volta ao estado anterior do histórico', async ({ page }) => {
  await page.goto('/')
  await openLogin(page)
  await expect(page).toHaveURL(/auth=login/)
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/auth=login/)
  await expect(page.getByRole('button', { name: 'Entrar', exact: true }).first()).toBeFocused()

  await openLogin(page)
  await page.goBack()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('ao entrar pelo teclado o foco vai para o botão da conta', async ({ page }) => {
  await page.goto('/')
  const entrar = page.getByRole('button', { name: 'Entrar', exact: true }).first()
  await entrar.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog').getByLabel('E-mail')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(entrar).toBeFocused()

  await page.keyboard.press('Enter')
  await signIn(page, USERS.ana)
  await expect(accountButton(page, USERS.ana)).toBeFocused()
})

test('falha do serviço de login é informada sem perder o e-mail digitado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kurio:mock-scenarios', 'login-error'))
  await page.goto('/?auth=login')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText(/indisponível/)
  await expect(dialog.getByLabel('E-mail')).toHaveValue(USERS.ana.email)
})
