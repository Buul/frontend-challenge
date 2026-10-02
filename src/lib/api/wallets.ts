import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { privateKey } from './auth'
import type { CollectorWallets, WalletCommand, WalletSettingsRequest } from './types'

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
    mutationFn: async (command: WalletCommand) => {
      if (command.action === 'mirror') {
        return (await api.patch<CollectorWallets>('/auth/wallets', { mirrorPrimary: command.mirrorPrimary } satisfies WalletSettingsRequest)).data
      }
      // Create the slot the first time, replace it afterwards.
      const exists = Boolean(queryClient.getQueryData<CollectorWallets>(privateKey(userId, 'wallets'))?.[command.slot])
      const url = `/auth/wallets/${command.slot}`
      return (exists ? await api.put<CollectorWallets>(url, command.wallet) : await api.post<CollectorWallets>(url, command.wallet)).data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(privateKey(userId, 'wallets'), data)
    },
  })
}
