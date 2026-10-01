import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Blog } from '@/components/home/blog'
import { FeaturedBanner } from '@/components/home/featured-banner'
import { FiltersPanel } from '@/components/home/filters-panel'
import { Hero } from '@/components/home/hero'
import { NftGrid } from '@/components/home/nft-grid'
import { Promos } from '@/components/home/promos'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { featuredNftsQueryOptions, nftFacetsQueryOptions, nftListQueryOptions } from '@/lib/api/nfts'
import { COLLECTIONS, NETWORKS, NFT_SEARCH_MAX_LENGTH, NFT_SORTS, NFT_TABS, type NftQuery } from '@/lib/api/types'
import { compareEth, isEthAmount, normalizeEth } from '@/lib/eth'

const pick = <T extends string>(options: readonly { id: T }[], value: unknown) =>
  options.find((option) => option.id === value)?.id

// The router's query decoder turns numeric-looking values into numbers, but only when the
// conversion is lossless (`String(Number(raw)) === raw`), so converting back is exact.
const raw = (value: unknown) => (typeof value === 'number' ? String(value) : value)

const text = (value: unknown) => {
  const input = raw(value)
  const trimmed = typeof input === 'string' ? input.trim().slice(0, NFT_SEARCH_MAX_LENGTH) : ''
  return trimmed || undefined
}

const pageNumber = (value: unknown) => {
  const input = raw(value)
  const number = typeof input === 'string' && input !== '' ? Number(input) : Number.NaN
  return Number.isInteger(number) && number > 1 ? number : undefined
}

const eth = (value: unknown) => {
  const input = raw(value)
  return isEthAmount(input) ? normalizeEth(input) : undefined
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): Partial<NftQuery> => {
    const minPrice = eth(search.minPrice)
    const maxPrice = eth(search.maxPrice)
    const invalidRange = minPrice !== undefined && maxPrice !== undefined && compareEth(minPrice, maxPrice) > 0

    return {
      q: text(search.q),
      tab: pick(NFT_TABS, search.tab),
      sort: pick(NFT_SORTS, search.sort),
      page: pageNumber(search.page),
      collection: pick(COLLECTIONS, search.collection),
      network: pick(NETWORKS, search.network),
      minPrice: invalidRange ? undefined : minPrice,
      maxPrice: invalidRange ? undefined : maxPrice,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(featuredNftsQueryOptions())
    void context.queryClient.prefetchQuery(nftFacetsQueryOptions())
    void context.queryClient.prefetchQuery(nftListQueryOptions(toQuery(deps)))
  },
  component: Home,
})

const CLEARED_FILTERS = {
  q: undefined,
  collection: undefined,
  network: undefined,
  minPrice: undefined,
  maxPrice: undefined,
} satisfies Partial<NftQuery>

function toQuery(search: Partial<NftQuery>): NftQuery {
  return { ...search, tab: search.tab ?? 'all', sort: search.sort ?? 'recent', page: search.page ?? 1 }
}

function Home() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = toQuery(search)

  const featured = useQuery(featuredNftsQueryOptions())
  const facets = useQuery(nftFacetsQueryOptions())
  const list = useQuery(nftListQueryOptions(query))

  const update = (patch: Partial<NftQuery>, resetPage = true) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch, ...(resetPage && { page: undefined }) }),
      resetScroll: false,
    })

  const lastPage = list.data && !list.isPlaceholderData && list.data.page > list.data.totalPages ? list.data.totalPages : undefined
  useEffect(() => {
    if (lastPage === undefined) return
    void navigate({ search: (prev) => ({ ...prev, page: lastPage > 1 ? lastPage : undefined }), replace: true, resetScroll: false })
  }, [lastPage, navigate])

  const hasFilters = Boolean(search.q || search.collection || search.network || search.minPrice || search.maxPrice)

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-8 xl:px-[120px]">
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="flex flex-col gap-24 outline-none">
        <Hero slides={featured.data} isError={featured.isError} onRetry={() => void featured.refetch()} />

        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-6 lg:w-[310px] lg:shrink-0">
            <FiltersPanel
              facets={facets.data}
              collection={search.collection}
              network={search.network}
              minPrice={search.minPrice}
              maxPrice={search.maxPrice}
              onChange={(patch) => update(patch)}
            />
            <FeaturedBanner />
          </div>
          <NftGrid
            tab={query.tab}
            sort={query.sort}
            result={list.data}
            isFetching={list.isFetching}
            isError={list.isError && !list.data}
            hasFilters={hasFilters}
            onTabChange={(tab) => update(tab === 'all' ? { ...CLEARED_FILTERS, tab: undefined } : { tab })}
            onSortChange={(sort) => update({ sort: sort === 'recent' ? undefined : sort })}
            onPageChange={(page) => update({ page: page === 1 ? undefined : page }, false)}
            onRetry={() => void list.refetch()}
            onClearFilters={() => update(CLEARED_FILTERS)}
          />
        </div>

        <Promos />
        <Blog />
      </main>
      <SiteFooter className="mt-16" />
    </div>
  )
}
