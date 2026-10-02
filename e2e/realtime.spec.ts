import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { accountButton, signInAt, USERS } from './auth-helpers.ts'
import { mockStorage, realtime } from './mock-helpers.ts'

const buy = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

const WALLET = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

/** Signs in, puts Emerald Ape #042 (open edition, 1.19 ETH) in the cart and opens the payment, ready to confirm. */
async function openCheckout(page: Page, testInfo: TestInfo) {
  await signInAt(page, '/nfts/nft-1?edition=open', USERS.ana)
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  if (testInfo.project.name === 'desktop') {
    await page.getByLabel('Nome de usuário').fill('anasouza')
    await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
    await page.getByLabel('Nome do perfil').fill('Ana')
    await page.getByLabel('Endereço da carteira').fill(WALLET)
    await page.getByLabel('Código de indicação').fill('AMIGO')
    await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
    await page.getByLabel('Tipo de carteira').selectOption('metamask')
  }
  await realtime(page).connected()
}

/** Waits for the detail to render from REST, so an event is a change on screen and not just the first load. */
async function openDetail(page: Page, path: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await realtime(page).connected()
}

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' }).click()
const receipt = (page: Page) => page.getByRole('dialog').getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })

test.describe('nft.updated', () => {
  test('preço e estoque mudam ao vivo no detalhe, com aviso acessível', async ({ page }) => {
    await openDetail(page, '/nfts/nft-1?edition=1-50')

    await realtime(page).updateNft('nft-1', { price: '1.47', available: { '1-50': 0 } })

    await expect(page.getByText('1.47 ETH').first()).toBeVisible()
    await expect(toast(page, 'O preço de Emerald Ape #042 mudou para 1.47 ETH.')).toBeVisible()
    await expect(page.getByText('Esta edição está esgotada. Escolha outra edição.').first()).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50 (esgotada)', exact: true })).toBeDisabled()
  })

  test('o card do catálogo acompanha o novo preço sem recarregar', async ({ page }) => {
    await page.goto('/')
    await realtime(page).connected()
    const card = page.getByRole('article').filter({ hasText: 'Sage Nomad #009' }).first()
    await expect(card).toContainText('1.69 ETH')

    await realtime(page).updateNft('nft-2', { price: '2.05' })

    await expect(card).toContainText('2.05 ETH')
  })

  test('o carrinho recalcula o total e tira o item que esgotou', async ({ page }) => {
    await page.goto('/nfts/nft-1?edition=open')
    await buy(page).click()
    await expect(page).toHaveURL(/\/cart$/)
    await realtime(page).connected()

    await realtime(page).updateNft('nft-1', { price: '1.47' })
    await expect(toast(page, 'O preço de Emerald Ape #042 no carrinho mudou para 1.47 ETH.')).toBeVisible()
    await expect(page.getByText('1.486 ETH')).toBeVisible()

    await realtime(page).updateNft('nft-1', { available: { open: 0 } })
    await expect(toast(page, 'Emerald Ape #042 (edição ABERTA) esgotou e saiu do carrinho.')).toBeVisible()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('eventos duplicados ou atrasados não voltam o estado', async ({ page }) => {
    await openDetail(page, '/nfts/nft-1?edition=open')

    const event = await realtime(page).updateNft('nft-1', { price: '1.47' })
    await expect(page.getByText('1.47 ETH').first()).toBeVisible()

    // The same event again, then an older version carrying another price, as a slow network could deliver them.
    await realtime(page).redeliver(event.id)
    await realtime(page).deliver({ ...event, id: 'stale-event', version: event.version - 1, data: { ...event.data, price: '0.33' } })
    // A newer event behind them proves the late ones were already processed (and dropped).
    await realtime(page).updateNft('nft-3', { price: '2.01' })
    await expect(page.getByText('0.33 ETH')).toHaveCount(0)
    await expect(page.getByText('1.47 ETH').first()).toBeVisible()
  })
})

test.describe('conexão', () => {
  test('ao reconectar, o que mudou offline vem pelo REST', async ({ page }) => {
    await openDetail(page, '/nfts/nft-1?edition=open')

    await realtime(page).setOnline(false)
    await expect(toast(page, 'Atualizações em tempo real indisponíveis. Tentando reconectar…')).toBeVisible()
    // Changed while the client could not hear about it: no event will ever arrive for it.
    await realtime(page).updateNftSilently('nft-1', { price: '1.58' })
    await expect(page.getByText('1.58 ETH')).toHaveCount(0)

    await realtime(page).setOnline(true)
    // The client retries with backoff (up to 2 s plus jitter), then refetches what is on screen.
    await expect(page.getByText('1.58 ETH').first()).toBeVisible({ timeout: 10_000 })
    await expect(toast(page, 'Atualizações em tempo real indisponíveis')).toHaveCount(0)
  })
})

test.describe('checkout', () => {
  test('preço que muda durante o pagamento é avisado e a compra sai pelo novo total', async ({ page }, testInfo) => {
    await openCheckout(page, testInfo)

    await realtime(page).updateNft('nft-1', { price: '1.47' })
    await expect(page.getByText('Os preços foram atualizados. O novo total é 1.486 ETH; revise antes de confirmar.')).toBeVisible()

    await confirm(page)
    await expect(receipt(page)).toBeVisible()
    await expect(page.getByRole('dialog').getByText('1.486 ETH').first()).toBeVisible()
  })

  test('o servidor recusa um total desatualizado e a confirmação seguinte usa o total novo', async ({ page }, testInfo) => {
    await openCheckout(page, testInfo)

    // The event is lost: only the server knows the price moved.
    await realtime(page).updateNftSilently('nft-1', { price: '1.47' })
    await confirm(page)
    await expect(page.getByText('Os preços ou a disponibilidade mudaram. Revise o novo total antes de confirmar.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await confirm(page)
    await expect(receipt(page)).toBeVisible()
  })
})

test.describe('order.updated', () => {
  test('pedido pendente sobrevive ao refresh e é confirmado pelo evento', async ({ page }, testInfo) => {
    // The simulated wallet takes long enough for the test to reload while the order is pending.
    await mockStorage(page, { 'kurio:mock:order-settle-ms': '600000' })
    await openCheckout(page, testInfo)

    await confirm(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\?order=KR-[A-Z0-9]{8}$/)

    await page.reload()
    await expect(dialog.getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    await realtime(page).connected()

    await realtime(page).settleOrders()
    await expect(receipt(page)).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Ver no Etherscan' })).toHaveAttribute('href', /https:\/\/etherscan\.io\/tx\/0x[a-f0-9]{64}/)
  })

  test('pagamento recusado é informado e os NFTs voltam ao carrinho', async ({ page }, testInfo) => {
    await mockStorage(page, { 'kurio:mock-scenarios': 'payment-refused' })
    await openCheckout(page, testInfo)

    await confirm(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(dialog.getByText('A carteira recusou a transação.', { exact: false })).toBeVisible()

    await dialog.getByRole('button', { name: 'Revisar e tentar de novo' }).click()
    await expect(dialog).toHaveCount(0)
    // Emerald Ape #042 is back: 1.19 ETH plus the 0.016 ETH network fee.
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  })

  test('o desfecho do pedido de uma sessão encerrada não chega à sessão seguinte', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'O fluxo de troca de conta é o mesmo; basta uma viewport.')
    await mockStorage(page, { 'kurio:mock:order-settle-ms': '600000' })
    await openCheckout(page, testInfo)
    await confirm(page)
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    const orderUrl = page.url()

    await page.goto('/')
    await accountButton(page, USERS.ana).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await signInAt(page, '/', USERS.bruno)
    await realtime(page).connected()

    await realtime(page).settleOrders()
    // Events reach a socket in order: once this later one shows up, Ana's order.updated would have too.
    const card = page.getByRole('article').filter({ hasText: 'Sage Nomad #009' }).first()
    await realtime(page).updateNft('nft-2', { price: '2.05' })
    await expect(card).toContainText('2.05 ETH')
    await expect(toast(page, /Pedido KR-/)).toHaveCount(0)

    // Bruno cannot read Ana's order either: the id is dropped from the URL.
    await page.goto(orderUrl)
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
