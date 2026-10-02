import { expect, test, type Page } from '@playwright/test'
import { accountButton, signInAt, signOut, USERS } from './auth-helpers.ts'

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

// An 8×8 PNG in the brand orange, enough for the browser to decode and resize.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO41uOBFTEMLQkAwK9qgaH1dbwAAAAASUVORK5CYII=', 'base64')

async function openProfile(page: Page) {
  await signInAt(page, '/profile', USERS.ana)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
}

const save = (page: Page) => page.getByRole('button', { name: 'Salvar' }).click()

test('campos obrigatórios vazios mostram o erro no campo e levam o foco até ele', async ({ page }) => {
  await openProfile(page)
  await page.getByLabel('Nome de exibição').fill('')
  await save(page)

  const displayName = page.getByLabel('Nome de exibição')
  await expect(displayName).toBeFocused()
  await expect(displayName).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
})

test('troca de senha: senha atual errada é recusada; a certa troca e vale no próximo login', async ({ page }) => {
  await openProfile(page)
  await page.getByLabel('Nome de usuário').fill('anasouza')
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByLabel('Apelido da carteira').fill('Principal')

  await page.getByLabel('Senha atual', { exact: true }).fill('SenhaErrada1')
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha2026')
  await save(page)
  await expect(page.getByText('A senha atual não confere.')).toBeVisible()
  await expect(page.getByLabel('Senha atual', { exact: true })).toBeFocused()

  await page.getByLabel('Senha atual', { exact: true }).fill(USERS.ana.password)
  await save(page)
  await expect(page.getByRole('status').filter({ hasText: 'Perfil salvo.' })).toBeVisible()

  await page.goto('/')
  await signOut(page, USERS.ana)
  await signInAt(page, '/', { ...USERS.ana, password: 'NovaSenha2026' })
  await expect(accountButton(page, USERS.ana)).toBeVisible()
})

test('avatar: troca persiste, formato inválido é recusado e remover limpa', async ({ page }) => {
  await openProfile(page)
  const input = page.getByLabel('Alterar avatar')

  await input.setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
  await expect(page.getByRole('alert').filter({ hasText: 'Use uma imagem PNG, JPG ou WebP.' })).toBeVisible()

  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('status').filter({ hasText: 'Avatar atualizado.' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveAttribute('src', /^data:image\/jpeg;base64,/)

  await page.reload()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

  await page.getByRole('button', { name: 'Remover avatar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Avatar removido.' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Remover avatar' })).toBeDisabled()
})

test('falha do serviço ao salvar é informada e mantém o que foi digitado', async ({ page }) => {
  await openProfile(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock-scenarios', 'profile-error'))
  await page.getByLabel('Nome de usuário').fill('anasouza')
  await page.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await page.getByLabel('Apelido da carteira').fill('Principal')
  await save(page)

  await expect(page.getByRole('alert').filter({ hasText: 'Serviço indisponível no momento. Tente novamente.' })).toBeVisible()
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('anasouza')
})
