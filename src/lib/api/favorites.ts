import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { currentUserId, privateKey, useSession } from './auth'
import { api } from './client'
import type { FavoriteList } from './types'

const favoriteKeys = {
  list: (userId: string) => privateKey(userId, 'favorites'),
}

export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: favoriteKeys.list(userId),
    queryFn: async ({ signal }) => (await api.get<FavoriteList>('/favorites', { signal })).data.data,
  })

/** For loaders: the root route has already resolved the session, so this only runs for signed-in users. */
export function prefetchFavorites(queryClient: QueryClient) {
  const userId = currentUserId(queryClient)
  if (userId) void queryClient.prefetchQuery(favoritesQueryOptions(userId))
}

type ToggleFavorite = { nftId: string; favorite: boolean }

const applyToggle = (ids: string[] = [], { nftId, favorite }: ToggleFavorite) =>
  favorite ? (ids.includes(nftId) ? ids : [...ids, nftId]) : ids.filter((id) => id !== nftId)

/** Optimistic: the list updates immediately and only the failed NFT is reverted on error. */
export function useToggleFavorite(userId: string | undefined) {
  const queryClient = useQueryClient()
  const key = favoriteKeys.list(userId ?? 'guest')
  // Callbacks can land after logout or a user switch; they must not touch the next user's cache.
  const isSameUser = () => userId !== undefined && currentUserId(queryClient) === userId

  return useMutation({
    mutationKey: key,
    mutationFn: async ({ nftId, favorite }: ToggleFavorite) => {
      const url = `/favorites/${encodeURIComponent(nftId)}`
      return (favorite ? await api.put<FavoriteList>(url) : await api.delete<FavoriteList>(url)).data.data
    },
    onMutate: async (variables) => {
      // Stops an in-flight refetch from overwriting the optimistic value with stale data.
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<string[]>(key, (ids) => applyToggle(ids, variables))
    },
    onError: (_error, variables) => {
      if (!isSameUser()) return
      queryClient.setQueryData<string[]>(key, (ids) => applyToggle(ids, { ...variables, favorite: !variables.favorite }))
    },
    onSettled: () => {
      // Refetching while other toggles are still pending would briefly undo their optimistic state.
      if (isSameUser() && queryClient.isMutating({ mutationKey: key }) === 1) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useFavorite(nftId: string) {
  const { user, isPending: sessionPending } = useSession()
  const favorites = useQuery({ ...favoritesQueryOptions(user?.id ?? 'guest'), enabled: Boolean(user) })
  const mutation = useToggleFavorite(user?.id)

  return {
    isAuthenticated: Boolean(user),
    isFavorite: favorites.data?.includes(nftId) ?? false,
    isReady: sessionPending ? false : !user || favorites.isSuccess,
    isError: favorites.isError && !favorites.data,
    isPending: mutation.isPending,
    refetch: favorites.refetch,
    setFavorite: mutation.mutate,
  }
}
