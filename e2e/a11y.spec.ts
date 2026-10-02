import { expect, test } from '@playwright/test'
import { signInAt, USERS } from './auth-helpers.ts'
import { buyButton } from './flows.ts'

test('o primeiro Tab mostra "Pular para o conteúdo", que leva o foco ao conteúdo', async ({ page }) => {
  await page.goto('/nfts/nft-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()

  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()
})

test('o foco do teclado é sempre visível', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#mercado article').first()).toBeVisible()

  // For each of the first Tab stops, the focused element (or a wrapper up to 3 levels, e.g. a field box or the
  // label around a hidden input) must look different with focus than without: outline, ring or border.
  for (let stop = 0; stop < 8; stop++) {
    await page.keyboard.press('Tab')
    const changed = await page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null
      if (!focused || focused === document.body) return true
      const chain: HTMLElement[] = []
      for (let node: HTMLElement | null = focused; node && chain.length < 4; node = node.parentElement) chain.push(node)
      const look = () => chain.map((node) => {
        const style = getComputedStyle(node)
        return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow, style.borderColor].join('|')
      })
      const withFocus = look()
      focused.blur()
      const withoutFocus = look()
      focused.focus()
      return withFocus.some((value, index) => value !== withoutFocus[index])
    })
    expect(changed, `parada ${stop + 1} do Tab sem indicador de foco`).toBe(true)
  }
})

test('o diálogo de login prende o foco e devolve ao fechar', async ({ page }) => {
  await page.goto('/')
  const entrar = page.getByRole('button', { name: 'Entrar', exact: true }).first()
  await entrar.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('E-mail')).toBeFocused()

  // Past the last control, focus wraps back into the dialog (the trap settles a frame after the Tab).
  for (let stop = 0; stop < 15; stop++) {
    await page.keyboard.press('Tab')
    await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(entrar).toBeFocused()
})

test('edição e compra funcionam só com o teclado', async ({ page }) => {
  await page.goto('/nfts/nft-1?edition=1-50')
  const edition = page.getByRole('radio', { name: '1/50', exact: true })
  await edition.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'ABERTA', exact: true })).toBeChecked()
  await expect(page).toHaveURL(/edition=open/)

  await page.getByRole('button', { name: 'Aumentar quantidade' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')

  await buyButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cart$/)
})

test('a 320 px (zoom de 400%) as telas não rolam na horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signInAt(page, '/', USERS.ana)

  for (const path of ['/', '/nfts/nft-1', '/cart', '/checkout', '/profile', '/wallets']) {
    await page.goto(path)
    await expect(page.locator('#conteudo')).toBeAttached()
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `${path} rola ${overflow}px na horizontal`).toBeLessThanOrEqual(0)
  }
})
