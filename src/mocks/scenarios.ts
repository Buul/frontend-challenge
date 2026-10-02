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

export const isScenarioActive = (scenario: MockScenario) =>
  (localStorage.getItem(SCENARIOS_STORAGE_KEY) ?? '').split(',').map((value) => value.trim()).includes(scenario)
