import { expect, test } from '@playwright/test'
import { signIn, signInAt, signOut, USERS } from './auth-helpers.ts'
import { buyButton as buy } from './flows.ts'

test('comprar no detalhe adiciona ao carrinho e persiste após refresh', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-50')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await buy(page).click()

  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')
  await expect(page.getByText('2.38 ETH').first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')
})

test('quantidade, exclusão e código promocional atualizam o resumo', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)

  const quantity = page.getByRole('group', { name: 'Quantidade' })
  await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantity.locator('output')).toHaveText('2')

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('(-) 0.238')).toBeVisible()

  await page.getByRole('button', { name: /Remover Emerald Ape #042/ }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('código inválido é informado e o checkout pede login ao visitante', async ({ page }) => {
  await page.goto('/nfts/nft-5?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)

  await page.getByLabel('Código promocional').fill('INVALIDO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Código promocional inválido.')).toBeVisible()

  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page.getByRole('dialog')).toContainText('Entre para finalizar a compra.')
  await signIn(page, USERS.ana)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: /Pagamento/ })).toBeVisible()
})

test('ícone do header abre o carrinho vazio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'No mobile o atalho do carrinho fica na barra inferior.')
  await page.goto('/')
  await page.getByRole('link', { name: 'Carrinho vazio' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('código expirado é recusado com a mensagem certa', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)

  await page.getByLabel('Código promocional').fill('LANCAMENTO20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este código promocional expirou.')).toBeVisible()
  await expect(page.getByText('(-) 0.00')).toBeVisible()
})

test('o carrinho do visitante passa para a conta ao entrar e cada conta vê só o seu', async ({ page }) => {
  // Visitor picks Sage Nomad #009, then signs in as Ana: the item moves into Ana's cart.
  await page.goto('/nfts/nft-2?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.goto('/cart?auth=login')
  await signIn(page, USERS.ana)
  await expect(page.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()

  // Ana logs out: the browser is back to an empty visitor cart, not Ana's.
  await page.goto('/')
  await signOut(page, USERS.ana)
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

  // Bruno never sees Ana's items.
  await signInAt(page, '/cart', USERS.bruno)
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await page.goto('/')
  await signOut(page, USERS.bruno)

  // And Ana finds her cart where she left it.
  await signInAt(page, '/cart', USERS.ana)
  await expect(page.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
})

test('cupom aplicado pode ser removido e a remoção persiste', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
  await expect(page.getByText('(-) 0.119')).toBeVisible()

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cupom removido.' })).toBeVisible()
  await expect(page.getByText('(-) 0.00')).toBeVisible()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toHaveCount(0)

  await page.reload()
  await expect(page.getByText('(-) 0.00')).toBeVisible()
})
