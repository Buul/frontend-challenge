import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { privateKey } from './auth'
import type { CollectorWallets, WalletUpdateRequest } from './types'

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'wallets'),
    queryFn: async ({ signal }): Promise<CollectorWallets> => (await api.get<CollectorWallets>('/auth/wallets', { signal })).data,
  })

export function useCollectorWallets(userId?: string) {
  return useQuery({ ...walletsQueryOptions(userId ?? 'visitor'), enabled: Boolean(userId) })
}

export function useUpdateWallets(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: privateKey(userId, 'wallets'),
    mutationFn: async (input: WalletUpdateRequest) => (await api.put<CollectorWallets>('/auth/wallets', input)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(privateKey(userId, 'wallets'), data)
    },
  })
}
