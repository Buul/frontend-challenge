import { defineConfig, devices } from '@playwright/test'

const PORT = 4318
const localURL = `http://127.0.0.1:${PORT}`
/**
 * `E2E_BASE_URL` points the suite at an already running app (e.g. the production deployment) instead of building and
 * serving it locally. The mocks run in the browser, so a deployed build is tested exactly like the local one.
 */
const remoteURL = process.env.E2E_BASE_URL?.replace(/\/$/, '')
const baseURL = remoteURL ?? localURL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Every failure keeps its trace (open it with `pnpm exec playwright show-trace` or from the HTML report).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // The challenge's breakpoints: desktop 1440, tablet 768, mobile 390. Every flow runs on desktop and mobile;
  // the tablet runs the layout-sensitive specs (visual regression, accessibility, catalog, detail).
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
      testMatch: ['visual.spec.ts', 'a11y.spec.ts', 'catalog.spec.ts', 'nft-detail.spec.ts', 'smoke.spec.ts'],
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview',
        url: localURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
