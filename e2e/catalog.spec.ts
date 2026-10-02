import { expect, test, type Page } from '@playwright/test'
import { mockStorage } from './mock-helpers.ts'

const cards = (page: Page) => page.locator('#mercado article')
// The grid's own live region: "36 NFTs encontrados, página 1 de 4."
const summary = (page: Page) => page.locator('#mercado [role=status]')

/** First ETH amount of each card, in order (a card may also show its previous, struck-through price). */
async function cardPrices(page: Page) {
  const texts = await cards(page).allInnerTexts()
  return texts.map((text) => Number(/(\d+(?:\.\d+)?) ETH/.exec(text)?.[1]))
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'Os filtros laterais e a ordenação ficam no layout desktop.')

  test('filtros combinados, ordenação e paginação vivem na URL e voltam com o histórico', async ({ page }) => {
    await page.goto('/?page=2')
    await expect(summary(page)).toHaveText('36 NFTs encontrados, página 2 de 4.')

    const filters = page.getByRole('complementary', { name: 'Filtros' })
    await filters.getByRole('button', { name: /^Arte digital/ }).click()
    // Changing a filter starts over from the first page.
    await expect(page).toHaveURL(/\?collection=digital-art$/)
    await expect(summary(page)).toHaveText('4 NFTs encontrados, página 1 de 1.')

    await filters.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/collection=digital-art/)
    await expect(page).toHaveURL(/network=ethereum/)

    await page.getByRole('combobox', { name: 'Ordenar por:' }).selectOption('price-desc')
    await expect(page).toHaveURL(/sort=price-desc/)
    await expect(summary(page)).toHaveText('4 NFTs encontrados, página 1 de 1.')
    const prices = await cardPrices(page)
    expect(prices).toEqual(prices.toSorted((a, b) => b - a))

    // The URL alone rebuilds the screen.
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Ordenar por:' })).toHaveValue('price-desc')
    await expect(filters.getByRole('button', { name: /^Arte digital/ })).toHaveAttribute('aria-pressed', 'true')

    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await page.goBack()
    await expect(page).not.toHaveURL(/network=/)
    await expect(filters.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute('aria-pressed', 'false')
    await page.goBack()
    await expect(page).toHaveURL(/\?page=2$/)
    await expect(summary(page)).toHaveText('36 NFTs encontrados, página 2 de 4.')
    await page.goForward()
    await expect(page).toHaveURL(/\?collection=digital-art$/)
  })

  test('paginação avança e trocar a categoria volta à primeira página', async ({ page }) => {
    await page.goto('/')
    await expect(summary(page)).toHaveText('36 NFTs encontrados, página 1 de 4.')

    await page.getByRole('button', { name: 'Página 3' }).click()
    await expect(page).toHaveURL(/page=3/)
    await expect(summary(page)).toHaveText('36 NFTs encontrados, página 3 de 4.')
    await expect(page.getByRole('button', { name: 'Página 3' })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('group', { name: 'Categorias' }).getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page).not.toHaveURL(/page=/)
  })

  test('sem resultados, o estado vazio oferece limpar os filtros', async ({ page }) => {
    await page.goto('/?collection=digital-art&network=polygon')
    await expect(page.getByText('Nenhum NFT encontrado com esses critérios.')).toBeVisible()

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(summary(page)).toHaveText('36 NFTs encontrados, página 1 de 4.')
    await expect(page).not.toHaveURL(/collection=/)
  })
})

test('a busca filtra pelo nome e fica na URL', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) {
    await page.getByRole('searchbox', { name: 'Buscar NFTs por nome' }).fill('golden')
  } else {
    await page.getByRole('button', { name: 'Abrir busca' }).click()
    await page.getByRole('searchbox', { name: 'Buscar NFTs por nome' }).fill('golden')
  }
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/q=golden/)
  await expect(summary(page)).toHaveText('3 NFTs encontrados, página 1 de 1.')
  for (const text of await cards(page).allInnerTexts()) expect(text).toMatch(/Golden/)
})

test('enquanto o catálogo carrega, skeletons ocupam o lugar dos cards', async ({ page }) => {
  await mockStorage(page, { 'kurio:mock-scenarios': 'slow-network' })
  await page.goto('/')

  const skeletons = page.locator('#mercado [data-slot=skeleton]')
  await expect(skeletons.first()).toBeVisible()
  await expect(summary(page)).toHaveText('Carregando NFTs…')

  await expect(cards(page).first()).toBeVisible({ timeout: 10_000 })
  await expect(skeletons).toHaveCount(0)
})

test('falha ao carregar o catálogo é informada e "Tentar novamente" recupera', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('kurio:mock-scenarios', 'catalog-error'))
  await page.reload()

  // Transient failures are retried twice before the error is shown.
  const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs.' })
  await expect(alert).toBeVisible({ timeout: 15_000 })

  await page.evaluate(() => localStorage.removeItem('kurio:mock-scenarios'))
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page).first()).toBeVisible()
  await expect(alert).toHaveCount(0)
})
