import { expect, test, type Page } from '@playwright/test'
import { signInAt, USERS } from './auth-helpers.ts'

/**
 * Visual regression of the four screens the challenge names, on the default mock data (each test starts from a
 * clean browser, so prices, supply and carts are the fixtures'). Baselines live in `e2e/__screenshots__/`;
 * regenerate them with `pnpm test:e2e:update` after an intended visual change.
 */

/** Waits until fonts, images and pending requests have settled, so the capture is deterministic. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    // Lazy images below the fold would never load without scrolling: load them now so the full page is complete.
    for (const image of document.querySelectorAll<HTMLImageElement>('img[loading=lazy]')) image.loading = 'eager'
    await Promise.all(
      [...document.images].filter((image) => !image.complete).map((image) => new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))),
    )
  })
  // No skeleton may be left on screen.
  await expect(page.locator('[data-slot=skeleton]')).toHaveCount(0)
}

const buy = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })

test('home', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#mercado article').first()).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
})

test('detalhe do NFT', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-50')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
})

test('carrinho', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-50')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await buy(page).click()
  await page.goto('/nfts/nft-2?edition=open')
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
})

test('pagamento', async ({ page }) => {
  await signInAt(page, '/nfts/nft-1?edition=open', USERS.ana)
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('payment.png', { fullPage: true })
})
