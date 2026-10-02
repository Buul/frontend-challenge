import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { privateKey, sessionKeys } from './auth'
import type { CollectorProfile, ProfileUpdateRequest, ProfileUpdateResponse, SessionInfo } from './types'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'profile'),
    queryFn: async ({ signal }): Promise<CollectorProfile> => (await api.get<CollectorProfile>('/auth/profile', { signal })).data,
  })

export function useCollectorProfile(userId?: string) {
  return useQuery({ ...profileQueryOptions(userId ?? 'visitor'), enabled: Boolean(userId) })
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: privateKey(userId, 'profile'),
    mutationFn: async (input: ProfileUpdateRequest) => (await api.patch<ProfileUpdateResponse>('/auth/profile', input)).data,
    onSuccess: (data) => {
      queryClient.setQueryData<SessionInfo | null>(sessionKeys.current, (current) => (current ? { ...current, user: data.user } : current))
      queryClient.setQueryData(privateKey(data.user.id, 'profile'), data.profile)
    },
  })
}
