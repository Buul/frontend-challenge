import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      codeSplittingOptions: {
        // The home is the landing page: shipping it with the app saves a serial round trip before the first paint.
        splitBehavior: ({ routeId }) => (routeId === '/' ? [] : undefined),
      },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      // MSW's cookie store only needs `getDomain`; see the file for why the full package is swapped out.
      { find: /^tldts$/, replacement: path.resolve(import.meta.dirname, './src/mocks/tldts-lite.ts') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 4317,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4318,
    strictPort: true,
  },
})
