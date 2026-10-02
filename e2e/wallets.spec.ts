import { expect, test } from '@playwright/test'
import { accountButton, signInAt, USERS } from './auth-helpers.ts'

const ADDRESS = '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C'

test('salvar a carteira principal', async ({ page }) => {
  await signInAt(page, '/', USERS.ana)
  await accountButton(page, USERS.ana).click()
  await page.getByRole('menuitem', { name: 'Meu perfil' }).click()
  await expect(page).toHaveURL(/\/profile$/)

  // `isVisible()` does not wait: let the profile render before choosing how to reach "Carteiras".
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
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

test('carteira com dados inválidos mostra os erros e não é salva', async ({ page }) => {
  await signInAt(page, '/wallets', USERS.ana)
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()

  await page.getByLabel('Endereço da carteira').fill('nao-e-um-endereco')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()

  const displayName = page.getByLabel('Nome de exibição')
  await expect(displayName).toBeFocused()
  await expect(displayName).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Endereço da carteira')).toHaveAccessibleDescription('Informe um endereço 0x ou um nome ENS, como nome.eth.')

  await page.reload()
  await expect(page.getByLabel('Endereço da carteira')).toHaveValue('')
})

test('carteira secundária: salvar, recarregar e trocar por "Igual à carteira principal"', async ({ page }) => {
  await signInAt(page, '/wallets', USERS.ana)
  const primary = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Carteira principal' }) })
  await primary.getByLabel('Nome de exibição').fill('Ana Souza')
  await primary.getByLabel('Apelido da carteira').fill('Principal')
  await primary.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('ethereum')
  await primary.getByLabel('Nome do perfil').fill('Ana')
  await primary.getByLabel('Endereço da carteira').fill(ADDRESS)
  await primary.getByRole('combobox', { name: 'Tipo de carteira', exact: true }).selectOption('metamask')
  await primary.getByLabel('Código de indicação').fill('KURIO')
  await primary.getByLabel('E-mail').fill(USERS.ana.email)
  await primary.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('ana')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Carteira salva.' })).toBeVisible()

  const secondarySection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Carteira secundária' }) })
  await secondarySection.getByRole('button', { name: 'Adicionar' }).click()
  await secondarySection.getByLabel('Nome de exibição').fill('Ana Souza')
  await secondarySection.getByLabel('Apelido da carteira').fill('Reserva')
  await secondarySection.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('polygon')
  await secondarySection.getByLabel('Nome do perfil').fill('Ana')
  await secondarySection.getByLabel('Endereço da carteira').fill('nova.kurio.eth')
  await secondarySection.getByRole('combobox', { name: 'Tipo de carteira', exact: true }).selectOption('coinbase')
  await secondarySection.getByLabel('Código de indicação').fill('KURIO')
  await secondarySection.getByLabel('E-mail').fill(USERS.ana.email)
  await secondarySection.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('reserva')
  await secondarySection.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Carteira secundária salva.' })).toBeVisible()

  await page.reload()
  await expect(secondarySection.getByLabel('Apelido da carteira')).toHaveValue('Reserva')

  const mirror = page.getByRole('checkbox', { name: 'Igual à carteira principal' })
  await mirror.click()
  await expect(mirror).toHaveAttribute('aria-checked', 'true')
  await expect(secondarySection.getByLabel('Apelido da carteira')).toHaveCount(0)
  await page.reload()
  await expect(mirror).toHaveAttribute('aria-checked', 'true')
})

test('contrato REST das carteiras: criar, atualizar e conflitos', async ({ page }) => {
  await signInAt(page, '/wallets', USERS.ana)
  const statuses = await page.evaluate(async (address) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}` }
    const wallet = {
      displayName: 'Ana Souza',
      walletNickname: 'Principal',
      network: 'ethereum',
      profileName: 'Ana',
      walletAddress: address,
      secondaryAddress: '',
      walletType: 'metamask',
      referralCode: 'KURIO',
      email: 'ana@kurio.dev',
      ensName: 'ana',
      ensSuffix: 'eth',
    }
    const call = (method: string, path: string, body?: unknown) =>
      fetch(`/api/auth/wallets${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }).then((r) => r.status)
    return {
      updateMissing: await call('PUT', '/primary', wallet),
      create: await call('POST', '/primary', wallet),
      createAgain: await call('POST', '/primary', wallet),
      update: await call('PUT', '/primary', { ...wallet, walletNickname: 'Nova' }),
      unknownSlot: await call('POST', '/tertiary', wallet),
      invalid: await call('PUT', '/primary', { ...wallet, walletAddress: 'x' }),
      mirror: await call('PATCH', '', { mirrorPrimary: true }),
    }
  }, ADDRESS)
  expect(statuses).toEqual({ updateMissing: 404, create: 201, createAgain: 409, update: 200, unknownSlot: 404, invalid: 422, mirror: 200 })
})
