import { expect, type Page } from '@playwright/test'
import { signInAt, USERS, type TestUser } from './auth-helpers.ts'

/** Shared steps of the purchase flow, so every spec drives it the same way. */

export const WALLET_ADDRESS = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

/** "COMPRAR" on desktop, "Comprar NFT" on the mobile buy bar. */
export const buyButton = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })

export const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })

export const receiptHeading = (page: Page) => page.getByRole('dialog').getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })

/** A live region (`role=status`) showing `text`: toasts, inline confirmations, realtime notices. */
export const statusMessage = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

/** Below 768 px the app renders its mobile layout (saved wallets at checkout, bottom tab bar…). */
export const usesMobileLayout = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Signs in on Emerald Ape #042 (open edition, 1.19 ETH), buys one and opens the payment. */
export async function openCheckout(page: Page, user: TestUser = USERS.ana) {
  await signInAt(page, '/nfts/nft-1?edition=open', user)
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
}

/** Fills the collector profile (desktop layout, paying on Polygon); the mobile layout uses a saved wallet instead. */
export async function fillCollectorProfile(page: Page) {
  if (usesMobileLayout(page)) return
  await page.getByLabel('Nome de usuário').fill('anasouza')
  await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
  await page.getByLabel('Nome do perfil').fill('Ana')
  await page.getByLabel('Endereço da carteira').fill(WALLET_ADDRESS)
  await page.getByLabel('Código de indicação').fill('AMIGO')
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByLabel('Tipo de carteira').selectOption('metamask')
}

/** Opens the payment with the profile filled, ready for "Confirmar compra". */
export async function readyToConfirm(page: Page, user?: TestUser) {
  await openCheckout(page, user)
  await fillCollectorProfile(page)
}
