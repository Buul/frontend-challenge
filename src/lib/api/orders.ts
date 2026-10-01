import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import { checkoutSchema } from '@/lib/validation'
import { api } from './client'
import { cartKeys } from './cart'
import type { Cart, Order } from './types'

export type CheckoutRequest = z.infer<typeof checkoutSchema>

const emptyCart: Cart = { items: [], itemCount: 0, subtotal: '0', discount: '0', networkFee: '0', total: '0' }

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CheckoutRequest) => (await api.post<Order>('/orders', input)).data,
    onSuccess: () => queryClient.setQueryData(cartKeys.current, emptyCart),
  })
}
