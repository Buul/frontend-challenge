import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { ordersStore } from './orders-store'
import { realtimeControls, realtimeHandlers } from './realtime'

export const worker = setupWorker(...handlers, ...realtimeHandlers)

const MOCK_STORAGE_PREFIX = 'kurio:mock'

const kurioMock = {
  realtime: realtimeControls,
  /** Orders the server holds, across users; lets tests prove a retried or double-clicked purchase created one order. */
  orders: { count: () => ordersStore.count() },
  /** Wipes every piece of mock state (accounts, sessions, cart, orders, market, scenarios) and reloads the app. */
  reset() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(MOCK_STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key))
    window.location.reload()
  },
}

declare global {
  interface Window {
    kurioMock?: typeof kurioMock
  }
}

window.kurioMock = kurioMock
