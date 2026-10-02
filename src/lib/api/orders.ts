import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { EthAmount } from '@/lib/eth'
import { checkoutSchema } from '@/lib/validation'
import { currentUserId, privateKey } from './auth'
import { api } from './client'
import { cartKeys } from './cart'
import { ApiError } from './errors'
import type { Cart, Order } from './types'

export type CheckoutRequest = z.infer<typeof checkoutSchema>

/** `expectedTotal` is the total the collector saw; the server answers 409 if prices or supply moved since. */
export type PlaceOrderRequest = CheckoutRequest & { expectedTotal: EthAmount }

const emptyCart: Cart = { items: [], itemCount: 0, subtotal: '0', discount: '0', networkFee: '0', total: '0' }

export const orderKeys = {
  all: (userId: string) => privateKey(userId, 'orders'),
  detail: (userId: string, id: string) => privateKey(userId, 'orders', id),
}

export const orderQueryOptions = (userId: string, id: string) =>
  queryOptions({
    queryKey: orderKeys.detail(userId, id),
    queryFn: async ({ signal }) => (await api.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })).data,
    // A settled order never changes; a pending one moves on through `order.updated` (and a refetch on reconnect).
    staleTime: Infinity,
  })

/**
 * Places an order under an `Idempotency-Key`. Transient failures (network, timeout, 5xx) are retried with the same key,
 * so a response lost after the order was created gets that same order back instead of buying twice.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: PlaceOrderRequest; idempotencyKey: string }) =>
      (await api.post<Order>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && error.retryable,
    retryDelay: (attempt) => 400 * 2 ** attempt,
    onSuccess: (order) => {
      queryClient.setQueryData(cartKeys.current, emptyCart)
      // Cached under the buyer, so a later session never reads it.
      const userId = currentUserId(queryClient)
      if (userId) queryClient.setQueryData(orderKeys.detail(userId, order.id), order)
    },
  })
}

/**
 * One key per purchase attempt: confirming again with the same data reuses it (the server answers with the order
 * it already created, if any); different data, or a new purchase after a success, gets a fresh key.
 */
export function createAttemptKeys() {
  let current: { fingerprint: string; key: string } | undefined
  return {
    keyFor(input: PlaceOrderRequest) {
      const fingerprint = JSON.stringify(input)
      if (current?.fingerprint !== fingerprint) current = { fingerprint, key: crypto.randomUUID() }
      return current.key
    },
    reset() {
      current = undefined
    },
  }
}
