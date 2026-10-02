import './index.css'

/**
 * The mock backend (MSW) and the app are fetched in parallel: neither waits for the other to download, and the app
 * renders as soon as both are in, so no request can leave the page before the worker intercepts it.
 */
async function enableMocking() {
  if (import.meta.env.VITE_API_MOCKING === 'disabled') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: !import.meta.env.DEV })
}

void Promise.all([import('./app'), enableMocking()]).then(([{ renderApp }]) => renderApp())
