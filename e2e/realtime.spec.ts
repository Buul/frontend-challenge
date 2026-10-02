import { expect, test, type Page } from '@playwright/test'
import { signIn, signInAt, signOut, USERS } from './auth-helpers.ts'
import { buyButton as buy, confirmButton, fillCollectorProfile, readyToConfirm, receiptHeading as receipt, statusMessage as toast } from './flows.ts'
import { mockStorage, realtime } from './mock-helpers.ts'

/** Payment ready to confirm (see `readyToConfirm`), with the realtime connection up. */
async function openCheckout(page: Page) {
  await readyToConfirm(page)
  await realtime(page).connected()
}

/** Waits for the detail to render from REST, so an event is a change on screen and not just the first load. */
async function openDetail(page: Page, path: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await realtime(page).connected()
}

const confirm = (page: Page) => confirmButton(page).click()

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
  test('com o servidor recusando conexões desde o início, o aviso aparece e some ao reconectar', async ({ page }) => {
    await mockStorage(page, { 'kurio:mock-scenarios': 'realtime-offline' })
    await page.goto('/nfts/nft-1')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(toast(page, 'Atualizações em tempo real indisponíveis. Tentando reconectar…')).toBeVisible()

    await realtime(page).setOnline(true)
    await realtime(page).connected()
    await expect(toast(page, 'Atualizações em tempo real indisponíveis')).toHaveCount(0)
  })

  test('com entrega duplicada de eventos, cada mudança é aplicada uma vez só', async ({ page }) => {
    await mockStorage(page, { 'kurio:mock-scenarios': 'realtime-duplicates' })
    await page.goto('/nfts/nft-1?edition=open')
    await buy(page).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()
    await realtime(page).connected()

    let cartReads = 0
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().endsWith('/api/cart')) cartReads++
    })
    await realtime(page).updateNft('nft-1', { price: '1.47' })
    await expect(page.getByText('1.486 ETH').first()).toBeVisible()
    // A later event proves the duplicate was already delivered (and dropped) by the time we count.
    await realtime(page).updateNft('nft-3', { price: '2.01' })
    await page.waitForLoadState('networkidle')
    expect(cartReads).toBe(1)
  })

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
  test('edição que esgota durante o pagamento sai do pedido e a compra não pode ser confirmada', async ({ page }) => {
    await openCheckout(page)

    await realtime(page).updateNft('nft-1', { available: { open: 0 } })
    await expect(toast(page, 'Emerald Ape #042 (edição ABERTA) esgotou e saiu do carrinho.')).toBeVisible()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await expect(confirmButton(page)).toHaveCount(0)
  })

  test('estoque que cai abaixo da quantidade ajusta o pedido e avisa antes de confirmar', async ({ page }) => {
    await page.goto('/nfts/nft-2?edition=1-50&auth=login')
    await signIn(page, USERS.ana)
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')
    await buy(page).click()
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
    await fillCollectorProfile(page)
    await realtime(page).connected()

    await realtime(page).updateNft('nft-2', { available: { '1-50': 1 } })
    await expect(toast(page, 'A quantidade de Sage Nomad #009 no carrinho foi ajustada ao estoque disponível.')).toBeVisible()
    // 1 × 1.69 ETH + 0.016 ETH network fee.
    await expect(page.getByText('Os preços foram atualizados. O novo total é 1.706 ETH; revise antes de confirmar.')).toBeVisible()
  })

  test('preço que muda durante o pagamento é avisado e a compra sai pelo novo total', async ({ page }) => {
    await openCheckout(page)

    await realtime(page).updateNft('nft-1', { price: '1.47' })
    await expect(page.getByText('Os preços foram atualizados. O novo total é 1.486 ETH; revise antes de confirmar.')).toBeVisible()

    await confirm(page)
    await expect(receipt(page)).toBeVisible()
    await expect(page.getByRole('dialog').getByText('1.486 ETH').first()).toBeVisible()
  })

  test('a cotação revalidada antes de confirmar barra um total desatualizado e a confirmação seguinte usa o novo', async ({ page }) => {
    await openCheckout(page)
    const orderPosts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) orderPosts.push(request.url())
    })

    // The event is lost: only the server knows the price moved, and GET /cart/quote tells the page before it orders.
    await realtime(page).updateNftSilently('nft-1', { price: '1.47' })
    await confirm(page)
    await expect(page.getByText('Os preços ou a disponibilidade mudaram. Revise o novo total antes de confirmar.')).toBeVisible()
    await expect(page.getByText('1.486 ETH').first()).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(orderPosts).toHaveLength(0)

    await confirm(page)
    await expect(receipt(page)).toBeVisible()
    expect(orderPosts).toHaveLength(1)
  })
})

test.describe('order.updated', () => {
  test('pedido pendente sobrevive ao refresh e é confirmado pelo evento', async ({ page }) => {
    // The simulated wallet takes long enough for the test to reload while the order is pending.
    await mockStorage(page, { 'kurio:mock:order-settle-ms': '600000' })
    await openCheckout(page)

    await confirm(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\?order=KR-[A-Z0-9]{8}$/)

    await page.reload()
    await expect(dialog.getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    await realtime(page).connected()

    await realtime(page).settleOrders()
    await expect(receipt(page)).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Ver no Polygonscan' })).toHaveAttribute('href', /https:\/\/polygonscan\.com\/tx\/0x[a-f0-9]{64}/)
  })

  test('carteira que desconecta antes de assinar é informada e os NFTs voltam ao carrinho', async ({ page }) => {
    await mockStorage(page, { 'kurio:mock-scenarios': 'wallet-disconnected' })
    await openCheckout(page)

    await confirm(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Carteira desconectada' })).toBeVisible()
    await expect(dialog.getByText('A carteira se desconectou antes de assinar', { exact: false })).toBeVisible()

    await dialog.getByRole('button', { name: 'Revisar e tentar de novo' }).click()
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()
  })

  test('pagamento recusado é informado e os NFTs voltam ao carrinho', async ({ page }) => {
    await mockStorage(page, { 'kurio:mock-scenarios': 'payment-refused' })
    await openCheckout(page)

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

  test('o desfecho do pedido de uma sessão encerrada não chega à sessão seguinte', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O fluxo de troca de conta é o mesmo; basta uma viewport.')
    await mockStorage(page, { 'kurio:mock:order-settle-ms': '600000' })
    await openCheckout(page)
    await confirm(page)
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Confirmando o pagamento' })).toBeVisible()
    const orderUrl = page.url()

    await page.goto('/')
    await signOut(page, USERS.ana)
    await signInAt(page, '/', USERS.bruno)
    await realtime(page).connected()

    await realtime(page).settleOrders()
    // Events reach a socket in order: once this later one shows up, Ana's order.updated would have too.
    const card = page.getByRole('article').filter({ hasText: 'Sage Nomad #009' }).first()
    await realtime(page).updateNft('nft-2', { price: '2.05' })
    await expect(card).toContainText('2.05 ETH')
    await expect(toast(page, /Pedido KR-/)).toHaveCount(0)

    // Bruno cannot read Ana's order either: the API answers 403 and the id is dropped from the URL.
    await page.goto(orderUrl)
    await expect(page.getByRole('alert').filter({ hasText: 'Este pedido pertence a outra conta.' })).toBeVisible()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
