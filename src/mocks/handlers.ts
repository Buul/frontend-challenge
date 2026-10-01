import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import {
  COLLECTIONS,
  NETWORKS,
  NFT_SEARCH_MAX_LENGTH,
  NFT_SORTS,
  NFT_TABS,
  type CollectionId,
  type FavoriteList,
  type FeaturedNftList,
  type NetworkId,
  type NftDetail,
  type NftFacets,
  type NftPage,
  type RelatedNftList,
} from '@/lib/api/types'
import type { ApiErrorBody } from '@/lib/api/errors'
import { compareEth, isEthAmount } from '@/lib/eth'
import { featuredNfts, nftDetails, nfts, relatedNfts } from './data'
import { favoritesStore } from './favorites-store'
import { notFound, serviceUnavailable, validationError } from './http'
import { isScenarioActive } from './scenarios'

const API = import.meta.env.VITE_API_URL ?? '/api'
const PAGE_SIZE = 9

const countBy = <K extends string>(ids: readonly { id: K }[], key: (nft: (typeof nfts)[number]) => K) =>
  Object.fromEntries(ids.map(({ id }) => [id, nfts.filter((nft) => key(nft) === id).length])) as Record<K, number>

function parseListParams(params: URLSearchParams) {
  const errors: Record<string, string> = {}

  const option = <T extends string>(name: string, options: readonly { id: T }[]) => {
    const value = params.get(name)
    if (value === null || value === '') return undefined
    const match = options.find((item) => item.id === value)?.id
    if (!match) errors[name] = `Valor inválido: ${value}`
    return match
  }

  const eth = (name: string) => {
    const value = params.get(name)
    if (value === null || value === '') return undefined
    if (!isEthAmount(value)) errors[name] = 'Informe um valor decimal em ETH.'
    return isEthAmount(value) ? value : undefined
  }

  const rawPage = params.get('page') ?? '1'
  const page = Number(rawPage)
  if (!Number.isInteger(page) || page < 1) errors.page = 'A página deve ser um inteiro maior ou igual a 1.'

  const q = params.get('q')?.trim() ?? ''
  if (q.length > NFT_SEARCH_MAX_LENGTH) errors.q = `A busca aceita até ${NFT_SEARCH_MAX_LENGTH} caracteres.`

  const query = {
    q: q.toLocaleLowerCase('pt-BR'),
    tab: option('tab', NFT_TABS) ?? 'all',
    sort: option('sort', NFT_SORTS) ?? 'recent',
    collection: option('collection', COLLECTIONS),
    network: option('network', NETWORKS),
    minPrice: eth('minPrice'),
    maxPrice: eth('maxPrice'),
    page,
  }

  if (query.minPrice && query.maxPrice && compareEth(query.minPrice, query.maxPrice) > 0) {
    errors.minPrice = 'O preço mínimo não pode ser maior que o máximo.'
  }

  return { query, errors }
}

export const handlers: RequestHandler[] = [
  http.get(`${API}/nfts/featured`, async () => {
    await delay(100)
    return HttpResponse.json<FeaturedNftList>({ data: featuredNfts })
  }),

  http.get(`${API}/nfts/facets`, async () => {
    await delay(150)
    const prices = nfts.map((nft) => nft.price).toSorted(compareEth)
    return HttpResponse.json<NftFacets>({
      collections: countBy<CollectionId>(COLLECTIONS, (nft) => nft.collection),
      networks: countBy<NetworkId>(NETWORKS, (nft) => nft.network),
      price: { min: prices[0], max: prices[prices.length - 1] },
    })
  }),

  http.get<never, never, NftPage | ApiErrorBody>(`${API}/nfts`, async ({ request }) => {
    await delay(250)
    const { query, errors } = parseListParams(new URL(request.url).searchParams)
    if (Object.keys(errors).length > 0) return validationError(errors)

    const filtered = nfts
      .filter((nft) => !query.q || nft.name.toLocaleLowerCase('pt-BR').includes(query.q))
      .filter((nft) => query.tab === 'all' || (query.tab === 'new' ? nft.isNew : nft.isTrending))
      .filter((nft) => !query.collection || nft.collection === query.collection)
      .filter((nft) => !query.network || nft.network === query.network)
      .filter((nft) => !query.minPrice || compareEth(nft.price, query.minPrice) >= 0)
      .filter((nft) => !query.maxPrice || compareEth(nft.price, query.maxPrice) <= 0)
      .toSorted((a, b) => {
        if (query.sort === 'price-asc') return compareEth(a.price, b.price)
        if (query.sort === 'price-desc') return compareEth(b.price, a.price)
        return b.listedAt.localeCompare(a.listedAt)
      })

    return HttpResponse.json<NftPage>({
      data: filtered.slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE),
      page: query.page,
      pageSize: PAGE_SIZE,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    })
  }),

  // Registered after the static `/nfts/*` routes so `featured` and `facets` are never read as ids.
  http.get<{ id: string }, never, NftDetail | ApiErrorBody>(`${API}/nfts/:id`, async ({ params }) => {
    await delay(300)
    const detail = nftDetails.get(params.id)
    return detail ? HttpResponse.json<NftDetail>(detail) : notFound('NFT não encontrado.')
  }),

  http.get<{ id: string }, never, RelatedNftList | ApiErrorBody>(`${API}/nfts/:id/related`, async ({ params }) => {
    await delay(400)
    if (!nftDetails.has(params.id)) return notFound('NFT não encontrado.')
    return HttpResponse.json<RelatedNftList>({ data: relatedNfts(params.id) })
  }),

  http.get(`${API}/favorites`, async () => {
    await delay(200)
    return HttpResponse.json<FavoriteList>({ data: favoritesStore.list() })
  }),

  // PUT and DELETE are idempotent: repeating either leaves the same list.
  ...(['put', 'delete'] as const).map((method) =>
    http[method]<{ nftId: string }, never, FavoriteList | ApiErrorBody>(`${API}/favorites/:nftId`, async ({ params }) => {
      await delay(500)
      if (isScenarioActive('favorites-error')) return serviceUnavailable()
      if (!nftDetails.has(params.nftId)) return notFound('NFT não encontrado.')
      const ids = method === 'put' ? favoritesStore.add(params.nftId) : favoritesStore.remove(params.nftId)
      return HttpResponse.json<FavoriteList>({ data: ids })
    }),
  ),

  http.post(`${API}/newsletter`, async ({ request }) => {
    await delay(400)
    const { email } = (await request.json()) as { email?: unknown }
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return validationError({ email: 'Informe um e-mail válido.' }, 'Informe um e-mail válido.')
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
