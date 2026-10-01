import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Cart, CartItemInput } from './types'

export const cartKeys = { current: ['cart'] as const }

export const cartQueryOptions = () =>
  queryOptions({
    queryKey: cartKeys.current,
    queryFn: async ({ signal }) => (await api.get<Cart>('/cart', { signal })).data,
  })

export function useCart() {
  return useQuery(cartQueryOptions())
}

function rememberCart(queryClient: ReturnType<typeof useQueryClient>) {
  return (cart: Cart) => queryClient.setQueryData(cartKeys.current, cart)
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: CartItemInput) => (await api.post<Cart>('/cart/items', item)).data,
    onSuccess: rememberCart(queryClient),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: CartItemInput) => (await api.patch<Cart>('/cart/items', item)).data,
    onSuccess: rememberCart(queryClient),
  })
}

export function useApplyPromo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => (await api.post<Cart>('/cart/promo', { code })).data,
    onSuccess: rememberCart(queryClient),
  })
}
