const { chromium } = require('@playwright/test')

/**
 * Audits the home and an NFT detail on the production build with the default mock data, three runs each, and asserts
 * on the median run. `LHCI_FORM_FACTOR` picks the profile: `desktop` (default) or `mobile` (Lighthouse's mobile
 * emulation and throttling). `pnpm lighthouse` runs both; `scripts/lighthouse-summary.mjs` prints the medians.
 */
const formFactor = process.env.LHCI_FORM_FACTOR === 'mobile' ? 'mobile' : 'desktop'

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm build && pnpm preview',
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 120000,
      url: ['http://127.0.0.1:4318/', 'http://127.0.0.1:4318/nfts/nft-1'],
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
      settings: {
        ...(formFactor === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      // Each URL is judged by its median run.
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `.lighthouseci/${formFactor}`,
    },
  },
}
