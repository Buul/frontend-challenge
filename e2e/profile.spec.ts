import { expect, test } from '@playwright/test'
import { accountButton, signInAt, USERS } from './auth-helpers.ts'

test('salvar o perfil do colecionador', async ({ page }) => {
  await signInAt(page, '/', USERS.ana)
  await accountButton(page, USERS.ana).click()
  await page.getByRole('menuitem', { name: 'Meu perfil' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

  await page.getByLabel('Nome de usuário').fill('anasouza')
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByLabel('Apelido da carteira').fill('Principal')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Perfil salvo.' })).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('anasouza')
  await expect(page.getByRole('textbox', { name: 'Nome ENS', exact: true })).toHaveValue('ana')
  await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Principal')
})
