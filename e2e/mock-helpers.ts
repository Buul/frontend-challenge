import { expect, type Page } from '@playwright/test'

type NftChange = { price?: string; available?: Record<string, number> }
export type RealtimeEvent = { id: string; version: number; data: Record<string, unknown> } & Record<string, unknown>

/** The subset of `window.kurioMock` (see `src/mocks/browser.ts`) the tests drive. */
type KurioMock = {
  realtime: {
    connections: () => number
    updateNft: (id: string, change: NftChange) => RealtimeEvent
    updateNftSilently: (id: string, change: NftChange) => void
    redeliver: (eventId: string) => void
    deliver: (event: RealtimeEvent) => void
    setOnline: (online: boolean) => void
    settleOrders: () => void
  }
}

type MockWindow = Window & { kurioMock: KurioMock }

/**
 * Drives the mocked backend. Each call changes the server's state; the app only learns about it
 * through its own Socket.IO client (or REST), never through a direct setter.
 */
export const realtime = (page: Page) => ({
  /** Waits until the app's Socket.IO client finished the handshake with the mocked server. */
  connected: () =>
    expect.poll(() => page.evaluate(() => (window as unknown as Partial<MockWindow>).kurioMock?.realtime.connections() ?? 0)).toBeGreaterThan(0),
  updateNft: (id: string, change: NftChange) =>
    page.evaluate(([nftId, value]) => (window as unknown as MockWindow).kurioMock.realtime.updateNft(nftId, value), [id, change] as const),
  updateNftSilently: (id: string, change: NftChange) =>
    page.evaluate(([nftId, value]) => (window as unknown as MockWindow).kurioMock.realtime.updateNftSilently(nftId, value), [id, change] as const),
  redeliver: (eventId: string) => page.evaluate((id) => (window as unknown as MockWindow).kurioMock.realtime.redeliver(id), eventId),
  deliver: (event: RealtimeEvent) => page.evaluate((value) => (window as unknown as MockWindow).kurioMock.realtime.deliver(value), event),
  setOnline: (online: boolean) => page.evaluate((value) => (window as unknown as MockWindow).kurioMock.realtime.setOnline(value), online),
  settleOrders: () => page.evaluate(() => (window as unknown as MockWindow).kurioMock.realtime.settleOrders()),
})

/** Sets mock scenarios and options before the app boots (they are read from `localStorage`). */
export const mockStorage = (page: Page, entries: Record<string, string>) =>
  page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  }, entries)
