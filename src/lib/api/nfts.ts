import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { FeaturedNftList, NftDetail, NftFacets, NftPage, NftQuery, RelatedNftList } from './types'

const nftKeys = {
  all: ['nfts'] as const,
  list: (query: NftQuery) => [...nftKeys.all, 'list', query] as const,
  facets: () => [...nftKeys.all, 'facets'] as const,
  featured: () => [...nftKeys.all, 'featured'] as const,
  detail: (id: string) => [...nftKeys.all, 'detail', id] as const,
  related: (id: string) => [...nftKeys.all, 'related', id] as const,
}

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: nftKeys.detail(id),
    queryFn: async ({ signal }) => (await api.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
  })

export const relatedNftsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: nftKeys.related(id),
    queryFn: async ({ signal }) =>
      (await api.get<RelatedNftList>(`/nfts/${encodeURIComponent(id)}/related`, { signal })).data.data,
    staleTime: 5 * 60_000,
  })

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
