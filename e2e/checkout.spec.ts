import { expect, test } from '@playwright/test'
import { signIn, USERS } from './auth-helpers.ts'
import { confirmButton, openCheckout, readyToConfirm, receiptHeading, usesMobileLayout, WALLET_ADDRESS } from './flows.ts'
import { mockStorage, orderCount } from './mock-helpers.ts'

test('confirmar a compra mostra o recibo, com o explorador da rede, e esvazia o carrinho', async ({ page }) => {
  await openCheckout(page)

  if (!usesMobileLayout(page)) {
    await confirmButton(page).click()
    const username = page.getByLabel('Nome de usuário')
    await expect(username).toBeFocused()
    // The error is announced with the field (aria-describedby), not just shown next to it.
    await expect(username).toHaveAccessibleDescription('Informe seu nome de usuário.')

    await username.fill('anasouza')
    await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
    await page.getByLabel('Nome do perfil').fill('Ana')
    await page.getByLabel('Endereço da carteira').fill(WALLET_ADDRESS)
    await page.getByLabel('Código de indicação').fill('AMIGO')
    await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
    await page.getByLabel('Tipo de carteira').selectOption('metamask')
  }

  await confirmButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(receiptHeading(page)).toBeVisible()
  await expect(dialog.getByText('Emerald Ape #042')).toBeVisible()
  // Desktop pays on Polygon (chosen above); the mobile saved wallet "Reserva" is on Polygon too.
  await expect(dialog.getByRole('link', { name: 'Ver no Polygonscan' })).toHaveAttribute('href', /https:\/\/polygonscan\.com\/tx\/0x[a-f0-9]{64}/)

  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  if (!usesMobileLayout(page)) await expect(page.getByRole('link', { name: 'Carrinho vazio' })).toBeVisible()
})

test('no mobile, trocar a carteira salva muda a rede do pagamento', async ({ page }) => {
  test.skip(!usesMobileLayout(page), 'As carteiras salvas são o pagamento do layout mobile.')
  await openCheckout(page)

  await expect(page.getByRole('radio', { name: /Reserva/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Trocar carteira' }).click()
  await expect(page.getByRole('radio', { name: /Principal/ })).toHaveAttribute('aria-checked', 'true')
  // The radio itself is visually hidden inside its card: pick the card.
  await page.getByRole('group', { name: 'Carteira e rede' }).getByText('MetaMask', { exact: true }).click()
  await expect(page.getByRole('radio', { name: /MetaMask/ })).toBeChecked()

  await confirmButton(page).click()
  const dialog = page.getByRole('dialog')
  await expect(receiptHeading(page)).toBeVisible()
  await expect(dialog.getByText('MetaMask')).toBeVisible()
  // "Principal" lives on Ethereum.
  await expect(dialog.getByRole('link', { name: 'Ver no Etherscan' })).toHaveAttribute('href', /https:\/\/etherscan\.io\/tx\//)
})

test('o recibo prende o foco e fecha com Esc, tirando o pedido da URL', async ({ page }) => {
  await readyToConfirm(page)
  await confirmButton(page).click()

  const dialog = page.getByRole('dialog')
  await expect(receiptHeading(page)).toBeVisible()
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  await expect(page).toHaveURL(/order=KR-/)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).not.toHaveURL(/order=/)
})

test('falha no pagamento é informada, nada é cobrado e a nova tentativa funciona', async ({ page }) => {
  await readyToConfirm(page)
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

test('cliques repetidos em confirmar criam um único pedido', async ({ page }) => {
  await readyToConfirm(page)

  await confirmButton(page).dblclick()
  await expect(receiptHeading(page)).toBeVisible()
  expect(await orderCount(page)).toBe(1)
})

test('timeout depois de criar o pedido é recuperado pela chave de idempotência', async ({ page }) => {
  // The server creates the order but answers only after 60 s; the client gives up at its 10 s timeout and retries with
  // the same key. The timeout is the XHR's own (not a JS timer), so this test waits for it for real.
  test.setTimeout(60_000)
  await mockStorage(page, { 'kurio:mock-scenarios': 'checkout-timeout' })
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) keys.push(request.headers()['idempotency-key'] ?? '')
  })

  await readyToConfirm(page)
  await confirmButton(page).click()

  await expect(receiptHeading(page)).toBeVisible({ timeout: 20_000 })
  expect(await orderCount(page)).toBe(1)
  expect(keys.length).toBeGreaterThanOrEqual(2)
  expect(new Set(keys).size).toBe(1)
  expect(keys[0]).not.toBe('')
})

test('sessão que expira no pagamento pede login de novo e a compra segue com o mesmo carrinho', async ({ page }) => {
  await readyToConfirm(page)
  // The server forgets every session, as if Ana's had expired while she filled the form.
  await page.evaluate(() => localStorage.removeItem('kurio:mock:sessions'))

  await confirmButton(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Sua sessão expirou')
  await signIn(page, USERS.ana)

  await expect(page).toHaveURL(/\/checkout/)
  if (!usesMobileLayout(page)) await expect(page.getByLabel('Nome de usuário')).toHaveValue('anasouza')
  await confirmButton(page).click()
  await expect(receiptHeading(page)).toBeVisible()
  expect(await orderCount(page)).toBe(1)
})
