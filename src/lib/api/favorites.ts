import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { FavoriteList } from './types'

const favoriteKeys = {
  all: ['favorites'] as const,
}

export const favoritesQueryOptions = () =>
  queryOptions({
    queryKey: favoriteKeys.all,
    queryFn: async ({ signal }) => (await api.get<FavoriteList>('/favorites', { signal })).data.data,
  })

type ToggleFavorite = { nftId: string; favorite: boolean }

const applyToggle = (ids: string[] = [], { nftId, favorite }: ToggleFavorite) =>
  favorite ? (ids.includes(nftId) ? ids : [...ids, nftId]) : ids.filter((id) => id !== nftId)

/** Optimistic: the list updates immediately and only the failed NFT is reverted on error. */
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: favoriteKeys.all,
    mutationFn: async ({ nftId, favorite }: ToggleFavorite) => {
      const url = `/favorites/${encodeURIComponent(nftId)}`
      return (favorite ? await api.put<FavoriteList>(url) : await api.delete<FavoriteList>(url)).data.data
    },
    onMutate: async (variables) => {
      // Stops an in-flight refetch from overwriting the optimistic value with stale data.
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all })
      queryClient.setQueryData<string[]>(favoriteKeys.all, (ids) => applyToggle(ids, variables))
    },
    onError: (_error, variables) => {
      queryClient.setQueryData<string[]>(favoriteKeys.all, (ids) => applyToggle(ids, { ...variables, favorite: !variables.favorite }))
    },
    onSettled: () => {
      // Refetching while other toggles are still pending would briefly undo their optimistic state.
      if (queryClient.isMutating({ mutationKey: favoriteKeys.all }) === 1) {
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
      }
    },
  })
}

export function useFavorite(nftId: string) {
  const favorites = useQuery(favoritesQueryOptions())
  const mutation = useToggleFavorite()

  return {
    isFavorite: favorites.data?.includes(nftId) ?? false,
    isReady: favorites.isSuccess,
    isError: favorites.isError && !favorites.data,
    isPending: mutation.isPending,
    refetch: favorites.refetch,
    setFavorite: mutation.mutate,
  }
}
