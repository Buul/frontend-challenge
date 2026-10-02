import { expect, test } from '@playwright/test'

test('acesso direto ao detalhe exibe o NFT', async ({ page }) => {
  await page.goto('/nfts/nft-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
})

test('NFT inexistente mostra a página de não encontrado', async ({ page }) => {
  await page.goto('/nfts/nao-existe')
  await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
  await expect(page).toHaveURL(/\/#mercado$/)
})

test('edição esgotada não pode ser comprada e a escolha fica na URL', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-1')
  await expect(page.getByText('Esta edição está esgotada. Escolha outra edição.').first()).toBeVisible()
  await expect(page.getByRole('radio', { name: '1/1 (esgotada)', exact: true })).toBeDisabled()

  await page.getByText('ABERTA').click()
  await expect(page).toHaveURL(/edition=open/)
  await expect(page.getByText('Esta edição está esgotada', { exact: false })).toHaveCount(0)
})

test('quantidade respeita o limite por pedido da edição', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-50')
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
  for (let i = 0; i < 4; i++) await increase.click()

  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('5')
  await expect(increase).toBeDisabled()
  await expect(page.getByText('Limite de 5 por pedido nesta edição.')).toBeVisible()
})

test('cards da home levam ao detalhe', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('#mercado').getByRole('link').first()
  const name = await card.textContent()
  await card.click()
  await expect(page.getByRole('heading', { level: 1, name: name! })).toBeVisible()
})

test('galeria, ampliação, abas e links de compartilhamento do detalhe', async ({ page, isMobile }) => {
  await page.goto('/nfts/nft-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  if (isMobile) {
    await page.getByRole('button', { name: 'Imagem 2 de 4' }).click()
    await expect(page.getByRole('button', { name: 'Imagem 2 de 4' })).toHaveAttribute('aria-current', 'true')
  } else {
    await page.getByRole('button', { name: 'Mostrar imagem 2 de 4' }).click()
    await expect(page.getByRole('button', { name: 'Mostrar imagem 2 de 4' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Ampliar imagem' }).click()
    const zoom = page.getByRole('dialog', { name: 'Emerald Ape #042' })
    await expect(zoom).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(zoom).toBeHidden()

    const share = page.getByRole('link', { name: 'Compartilhar no X/Twitter (abre em nova aba)' })
    await expect(share).toHaveAttribute('href', /twitter\.com\/intent\/tweet\?.*nfts%2Fnft-1/)
    await expect(share).toHaveAttribute('target', '_blank')
  }

  await page.getByRole('tab', { name: /Avaliações/ }).click()
  await expect(page.getByRole('tab', { name: /Avaliações/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: /Avaliações/ })).toContainText('Lia Costa')
})
