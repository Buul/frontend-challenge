import { expect, test, type Page } from '@playwright/test'
import {
  accountButton,
  fillSignup,
  signIn,
  signInAt,
  signOut,
  submitSignup,
  switchToLogin,
  switchToSignup,
  USERS,
  type TestUser,
} from './auth-helpers.ts'

const CARLA: TestUser = { name: 'Carla Dias', email: 'carla@kurio.dev', password: 'Colecao2026' }

const openLogin = (page: Page) => page.getByRole('button', { name: 'Entrar', exact: true }).first().click()

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

test('com o relógio adiantado além dos 30 min, a sessão expira sozinha e o login reabre', async ({ page }) => {
  // The client's expiry timer and the mock server's session check both follow the controlled clock.
  await page.clock.install()
  await signInAt(page, '/nfts/nft-2', USERS.ana)
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).not.toBeNull()

  await page.clock.fastForward('31:00')
  await expect(page.getByRole('dialog')).toContainText('Sua sessão expirou')
  await expect(page).toHaveURL(/\/nfts\/nft-2/)
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()
})

test('telas privadas levam o visitante ao login e voltam a elas, com a busca, depois de entrar', async ({ page }) => {
  await page.goto('/profile')
  await expect(page).toHaveURL(/^[^?]+\/\?auth=login&redirect=%2Fprofile$/)
  await expect(page.getByRole('dialog')).toContainText('Entre para ver o seu perfil.')
  await signIn(page, USERS.ana)
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

  await signOut(page, USERS.ana)
  await page.goto('/checkout?order=KR-ABCDEF12')
  await expect(page).toHaveURL(/\/cart\?auth=login&redirect=%2Fcheckout%3Forder%3DKR-ABCDEF12$/)
  await expect(page.getByRole('dialog')).toContainText('Entre para finalizar a compra.')
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

test('cadastro valida os campos, recusa e-mail já usado e a nova conta sobrevive ao refresh', async ({ page }) => {
  await page.goto('/?tab=new')
  await openLogin(page)
  await switchToSignup(page)
  await expect(page).toHaveURL(/auth=signup/)
  const dialog = page.getByRole('dialog')
  const name = dialog.getByLabel('Nome de usuário')
  const email = dialog.getByLabel('E-mail')
  const password = dialog.getByLabel('Senha', { exact: true })
  const confirm = dialog.getByLabel('Confirmar senha', { exact: true })
  await expect(name).toBeFocused()

  await submitSignup(page)
  await expect(name).toHaveAccessibleDescription('Informe seu nome de usuário.')
  await expect(email).toHaveAccessibleDescription('Informe seu e-mail.')
  await expect(password).toHaveAccessibleDescription('Crie uma senha.')
  await expect(confirm).toHaveAccessibleDescription('Confirme sua senha.')
  await expect(name).toBeFocused()

  await fillSignup(page, { ...CARLA, password: 'curta' }, 'outra')
  await expect(password).toHaveAccessibleDescription(/pelo menos 8 caracteres, com letras e números/)
  await expect(confirm).toHaveAccessibleDescription('As senhas não coincidem.')
  await expect(password).toBeFocused()

  await fillSignup(page, { ...CARLA, email: USERS.ana.email })
  await expect(email).toHaveAccessibleDescription(/Já existe uma conta com este e-mail/)
  await expect(email).toBeFocused()

  await email.fill(CARLA.email)
  await submitSignup(page)
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/\?tab=new$/)
  await expect(accountButton(page, CARLA)).toBeVisible()

  const stored = await page.evaluate(() => localStorage.getItem('kurio:mock:users') ?? '')
  expect(stored).toContain('passwordHash')
  expect(stored).not.toContain(CARLA.password)

  await page.reload()
  await expect(accountButton(page, CARLA)).toBeVisible()
  await signOut(page, CARLA)
  await signInAt(page, '/', CARLA)
  await expect(accountButton(page, CARLA)).toBeVisible()
})

test('alternar para o cadastro mantém o aviso e retoma o favorito com a conta nova', async ({ page }) => {
  await page.goto('/nfts/nft-1')
  const favorite = page.getByRole('button', { name: 'Favoritar' })
  await favorite.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Entre para salvar seus favoritos.')

  await switchToSignup(page)
  await expect(page).toHaveURL(/auth=signup/)
  await expect(dialog).toContainText('Entre para salvar seus favoritos.')
  await switchToLogin(page)
  await expect(page).toHaveURL(/auth=login/)
  await switchToSignup(page)

  await fillSignup(page, CARLA)
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/nfts\/nft-1$/)
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})

test('fechar o cadastro volta à tela de origem, e o link direto respeita o redirect', async ({ page }) => {
  await page.goto('/')
  await openLogin(page)
  await switchToSignup(page)
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/auth=/)
  await expect(page.getByRole('button', { name: 'Entrar', exact: true }).first()).toBeFocused()

  await page.goto('/?auth=signup&redirect=%2Fnfts%2Fnft-3')
  await fillSignup(page, CARLA)
  await expect(page).toHaveURL(/\/nfts\/nft-3$/)
  expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).not.toBeNull()
})

test('falha do serviço de cadastro é informada sem perder os dados digitados', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kurio:mock-scenarios', 'signup-error'))
  await page.goto('/?auth=signup')
  await fillSignup(page, CARLA)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toHaveText(/indisponível/)
  await expect(dialog.getByLabel('Nome de usuário')).toHaveValue(CARLA.name)
  await expect(dialog.getByLabel('E-mail')).toHaveValue(CARLA.email)
})
