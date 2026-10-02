import { defineConfig, devices } from '@playwright/test'

const PORT = 4318
const baseURL = `http://127.0.0.1:${PORT}`

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
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
