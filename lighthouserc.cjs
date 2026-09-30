const { chromium } = require('@playwright/test')

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm build && pnpm preview',
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 120000,
      url: ['http://127.0.0.1:4318/'],
      numberOfRuns: 1,
      chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
