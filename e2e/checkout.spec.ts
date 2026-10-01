import { expect, test, type Page } from '@playwright/test'
import { signInAt, USERS } from './auth-helpers.ts'

const buy = (page: Page) => page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })

const WALLET = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

async function openCheckout(page: Page) {
  await signInAt(page, '/nfts/nft-1?edition=open', USERS.ana)
  await buy(page).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
}

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
