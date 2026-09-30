import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { FeaturedNftList, NftFacets, NftPage, NftQuery } from './types'

const nftKeys = {
  all: ['nfts'] as const,
  list: (query: NftQuery) => [...nftKeys.all, 'list', query] as const,
  facets: () => [...nftKeys.all, 'facets'] as const,
  featured: () => [...nftKeys.all, 'featured'] as const,
}

export const nftListQueryOptions = (query: NftQuery) =>
  queryOptions({
    queryKey: nftKeys.list(query),
    queryFn: async ({ signal }) => (await api.get<NftPage>('/nfts', { params: query, signal })).data,
    placeholderData: keepPreviousData,
  })

export const nftFacetsQueryOptions = () =>
  queryOptions({
    queryKey: nftKeys.facets(),
    queryFn: async ({ signal }) => (await api.get<NftFacets>('/nfts/facets', { signal })).data,
    staleTime: Infinity,
  })

export const featuredNftsQueryOptions = () =>
  queryOptions({
    queryKey: nftKeys.featured(),
    queryFn: async ({ signal }) => (await api.get<FeaturedNftList>('/nfts/featured', { signal })).data.data,
    staleTime: 5 * 60_000,
  })

export async function subscribeNewsletter(email: string) {
  await api.post('/newsletter', { email })
}
