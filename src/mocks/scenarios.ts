/**
 * Failure scenarios toggled through `localStorage`, so they survive reloads and can be set by E2E tests
 * (via `addInitScript`) or by hand in DevTools, e.g. `localStorage.setItem('kurio:mock-scenarios', 'favorites-error')`.
 * Multiple scenarios are comma-separated.
 */
export const SCENARIOS_STORAGE_KEY = 'kurio:mock-scenarios'

export type MockScenario =
  /** Adding or removing a favorite answers 503. */
  | 'favorites-error'
  /** `POST /auth/login` answers 503. */
  | 'login-error'
  /** `POST /auth/register` answers 503. */
  | 'signup-error'
  /** Adding, updating or removing cart items answers 503. */
  | 'cart-error'
  /** `POST /orders` answers 503. */
  | 'checkout-error'
  /** `PATCH /auth/profile` answers 503. */
  | 'profile-error'
  /** `PUT /auth/wallets` answers 503. */
  | 'wallets-error'
  /** `POST /orders` creates the order but answers only after 60 s, past the client's timeout; the client retries with the same key. */
  | 'checkout-timeout'
  /** The wallet refuses the payment: orders settle as `refused` and the items go back to the cart. */
  | 'payment-refused'
  /** The wallet disconnects before signing: orders settle as `refused` (`failureCode: 'disconnected'`), items go back. */
  | 'wallet-disconnected'
  /** The realtime server refuses connections; clients keep retrying until the scenario is lifted. */
  | 'realtime-offline'
  /** Every NFT event is delivered twice, exercising duplicate tolerance on the client. */
  | 'realtime-duplicates'
  /** Random price changes are pushed every few seconds, to watch realtime updates by hand. */
  | 'market-live'
  /** Every API request takes 1.5 s longer, to see skeletons and pending states. */
  | 'slow-network'
  /** Each API request waits a random 0–1.2 s, so responses come back out of order. */
  | 'out-of-order'
  /** Every API request fails as if the network were down. */
  | 'network-offline'
  /** `GET /nfts` finds nothing. */
  | 'catalog-empty'
  /** `GET /nfts` answers 503. */
  | 'catalog-error'

export const isScenarioActive = (scenario: MockScenario) =>
  (localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '').split(',').map((value) => value.trim()).includes(scenario)

/** How long a pending order waits for the simulated wallet; tests shorten or stretch it via `localStorage`. */
export const ORDER_SETTLE_DELAY_KEY = 'kurio:mock:order-settle-ms'
const DEFAULT_ORDER_SETTLE_MS = 1500

export function orderSettleDelay() {
  const value = Number(localStorage.getItem(ORDER_SETTLE_DELAY_KEY))
  return Number.isFinite(value) && value >= 0 && localStorage.getItem(ORDER_SETTLE_DELAY_KEY) !== null ? value : DEFAULT_ORDER_SETTLE_MS
}

/** Extra latency, in ms, added to every API request (on top of each endpoint's own delay). */
export const LATENCY_KEY = 'kurio:mock:latency-ms'

export function extraLatency() {
  const fixed = Number(localStorage.getItem(LATENCY_KEY))
  const base = Number.isFinite(fixed) && fixed > 0 ? fixed : 0
  const slow = isScenarioActive('slow-network') ? 1500 : 0
  const jitter = isScenarioActive('out-of-order') ? Math.floor(Math.random() * 1200) : 0
  return base + slow + jitter
}
