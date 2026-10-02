import { expect, test } from '@playwright/test'
import { accountButton, signInAt, USERS } from './auth-helpers.ts'

const ADDRESS = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

test('salvar a carteira principal', async ({ page }) => {
  await signInAt(page, '/', USERS.ana)
  await accountButton(page, USERS.ana).click()
  await page.getByRole('menuitem', { name: 'Meu perfil' }).click()
  await expect(page).toHaveURL(/\/profile$/)

  const wallets = page.getByRole('link', { name: 'Carteiras' })
  if (!(await wallets.isVisible())) {
    await page.getByRole('button', { name: /Meu perfil/ }).click()
  }
  await wallets.click()
  await expect(page).toHaveURL(/\/wallets$/)
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()

  await page.getByLabel('Nome de exibição').fill('Ana Souza')
  await page.getByLabel('Apelido da carteira').fill('Principal')
  await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('ethereum')
  await page.getByLabel('Nome do perfil').fill('Ana')
  await page.getByLabel('Endereço da carteira').fill(ADDRESS)
  await page.getByRole('combobox', { name: 'Tipo de carteira', exact: true }).selectOption('metamask')
  await page.getByLabel('Código de indicação').fill('KURIO')
  await page.getByLabel('E-mail').fill(USERS.ana.email)
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Carteira salva.' })).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Endereço da carteira')).toHaveValue(ADDRESS)
  await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Principal')
  await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
})
