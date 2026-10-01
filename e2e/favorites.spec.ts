import { expect, test } from '@playwright/test'
import { signIn, signInAt, USERS } from './auth-helpers.ts'

test('visitante é levado ao login e o favorito é aplicado ao entrar', async ({ page }) => {
  await page.goto('/nfts/nft-1')
  const button = page.getByRole('button', { name: 'Favoritar' })
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  await button.click()
  await expect(page.getByRole('dialog')).toContainText('Entre para salvar seus favoritos.')
  await signIn(page, USERS.ana)

  await expect(page).toHaveURL(/\/nfts\/nft-1$/)
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Emerald Ape #042 foi adicionado aos favoritos.')).toBeVisible()
})

test('favoritar e desfavoritar persiste após refresh', async ({ page }) => {
  await signInAt(page, '/nfts/nft-1', USERS.ana)
  const button = page.getByRole('button', { name: 'Favoritar' })
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Emerald Ape #042 foi adicionado aos favoritos.')).toBeVisible()

  await page.reload()
  await expect(button).toHaveAttribute('aria-pressed', 'true')

  await button.click()
  await expect(page.getByText('Emerald Ape #042 foi removido dos favoritos.')).toBeVisible()
  await page.reload()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
})

test('coração do card na home mobile favorita e sincroniza com o detalhe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'O coração nos cards só existe no layout mobile.')
  await signInAt(page, '/', USERS.ana)
  const heart = page.getByRole('button', { name: 'Favoritar Emerald Ape #042' })
  await expect(heart).toHaveAttribute('aria-pressed', 'false')

  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').getByText('Emerald Ape #042 foi adicionado aos favoritos.')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)

  await page.locator('#mercado').getByRole('link', { name: 'Emerald Ape #042' }).click()
  await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('falha ao favoritar desfaz a atualização otimista e informa o erro', async ({ page }) => {
  await signInAt(page, '/nfts/nft-1', USERS.ana)
  await page.evaluate(() => localStorage.setItem('kurio:mock-scenarios', 'favorites-error'))
  const button = page.getByRole('button', { name: 'Favoritar' })
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Não foi possível favoritar/)).toBeVisible()
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  await page.evaluate(() => localStorage.removeItem('kurio:mock-scenarios'))
  await button.click()
  await expect(page.getByText('Emerald Ape #042 foi adicionado aos favoritos.')).toBeVisible()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
})
