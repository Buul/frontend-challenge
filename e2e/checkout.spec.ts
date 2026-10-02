import { expect, test, type Page } from '@playwright/test'
import { signInAt, USERS } from './auth-helpers.ts'
import { mockStorage, orderCount } from './mock-helpers.ts'

const buy = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })

const WALLET = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

async function openCheckout(page: Page) {
  await signInAt(page, '/nfts/nft-1?edition=open', USERS.ana)
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
}

/** Fills the collector profile on desktop; on mobile a saved wallet is already selected. */
async function fillProfile(page: Page, isMobile: boolean) {
  if (isMobile) return
  await page.getByLabel('Nome de usuário').fill('anasouza')
  await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
  await page.getByLabel('Nome do perfil').fill('Ana')
  await page.getByLabel('Endereço da carteira').fill(WALLET)
  await page.getByLabel('Código de indicação').fill('AMIGO')
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByLabel('Tipo de carteira').selectOption('metamask')
}

const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const receiptHeading = (page: Page) => page.getByRole('dialog').getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })

test('confirmar a compra mostra o recibo e esvazia o carrinho', async ({ page }, testInfo) => {
  await openCheckout(page)

  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Informe seu nome de usuário.')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('anasouza')
    await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
    await page.getByLabel('Nome do perfil').fill('Ana')
    await page.getByLabel('Endereço da carteira').fill(WALLET)
    await page.getByLabel('Código de indicação').fill('AMIGO')
    await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
    await page.getByLabel('Tipo de carteira').selectOption('metamask')
  }

  await page.getByRole('button', { name: 'Confirmar compra' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(dialog.getByText('Emerald Ape #042')).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Ver no Etherscan' })).toHaveAttribute('href', /https:\/\/etherscan\.io\/tx\/0x[a-f0-9]{64}/)

  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('link', { name: 'Carrinho vazio' })).toBeVisible()
  }
})

test('falha no pagamento é informada, nada é cobrado e a nova tentativa funciona', async ({ page, isMobile }) => {
  await openCheckout(page)
  await fillProfile(page, isMobile)
  await page.evaluate(() => localStorage.setItem('kurio:mock-scenarios', 'checkout-error'))

  await confirmButton(page).click()
  // Transient failures are retried with the same key before giving up.
  await expect(page.getByText('Serviço indisponível no momento. Tente novamente.')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await orderCount(page)).toBe(0)

  await page.evaluate(() => localStorage.removeItem('kurio:mock-scenarios'))
  await confirmButton(page).click()
  await expect(receiptHeading(page)).toBeVisible()
  expect(await orderCount(page)).toBe(1)
})

test('cliques repetidos em confirmar criam um único pedido', async ({ page, isMobile }) => {
  await openCheckout(page)
  await fillProfile(page, isMobile)

  await confirmButton(page).dblclick()
  await expect(receiptHeading(page)).toBeVisible()
  expect(await orderCount(page)).toBe(1)
})

test('resposta perdida depois de criar o pedido é recuperada pela chave de idempotência', async ({ page, isMobile }) => {
  // The server creates the order but the response never arrives; the client retries with the same Idempotency-Key.
  await mockStorage(page, { 'kurio:mock-scenarios': 'checkout-timeout' })
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) keys.push(request.headers()['idempotency-key'] ?? '')
  })

  await openCheckout(page)
  await fillProfile(page, isMobile)
  await confirmButton(page).click()

  await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
  expect(await orderCount(page)).toBe(1)
  expect(keys.length).toBeGreaterThanOrEqual(2)
  expect(new Set(keys).size).toBe(1)
  expect(keys[0]).not.toBe('')
})
