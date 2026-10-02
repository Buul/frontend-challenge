import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { EthAmount } from '@/lib/eth'
import { checkoutSchema } from '@/lib/validation'
import { currentUserId, privateKey } from './auth'
import { api } from './client'
import { cartKeys } from './cart'
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

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PlaceOrderRequest) => (await api.post<Order>('/orders', input)).data,
    onSuccess: (order) => {
      queryClient.setQueryData(cartKeys.current, emptyCart)
      // Cached under the buyer, so a later session never reads it.
      const userId = currentUserId(queryClient)
      if (userId) queryClient.setQueryData(orderKeys.detail(userId, order.id), order)
    },
  })
}
