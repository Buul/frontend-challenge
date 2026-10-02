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
  /** The wallet refuses the payment: orders settle as `refused` and the items go back to the cart. */
  | 'payment-refused'
  /** The realtime server refuses connections; clients keep retrying until the scenario is lifted. */
  | 'realtime-offline'
  /** Every NFT event is delivered twice, exercising duplicate tolerance on the client. */
  | 'realtime-duplicates'
  /** Random price changes are pushed every few seconds, to watch realtime updates by hand. */
  | 'market-live'

export const isScenarioActive = (scenario: MockScenario) =>
  (localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '').split(',').map((value) => value.trim()).includes(scenario)

/** How long a pending order waits for the simulated wallet; tests shorten or stretch it via `localStorage`. */
export const ORDER_SETTLE_DELAY_KEY = 'kurio:mock:order-settle-ms'
const DEFAULT_ORDER_SETTLE_MS = 1500

export function orderSettleDelay() {
  const value = Number(localStorage.getItem(ORDER_SETTLE_DELAY_KEY))
  return Number.isFinite(value) && value >= 0 && localStorage.getItem(ORDER_SETTLE_DELAY_KEY) !== null ? value : DEFAULT_ORDER_SETTLE_MS
}
