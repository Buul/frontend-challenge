import { Link } from '@tanstack/react-router'
import arrowDown from '@/assets/figma/arrow-down.svg'
import arrowRight2 from '@/assets/figma/arrow-right-2.svg'
import { FavoriteButton } from '@/components/nft/favorite-button'
import { useFavoriteToggle } from '@/components/nft/use-favorite-toggle'
import { InlineAlert, RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { NFT_SORTS, NFT_TABS, type Nft, type NftPage, type NftSort, type NftTab } from '@/lib/api/types'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

type NftGridProps = {
  tab: NftTab
  sort: NftSort
  result?: NftPage
  isFetching: boolean
  isError: boolean
  hasFilters: boolean
  onTabChange: (tab: NftTab) => void
  onSortChange: (sort: NftSort) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onClearFilters: () => void
  /** Shows the favorite heart on each card (mobile design only) and receives the toggle result. */
  onFavoriteFeedback?: (message: string) => void
}

function CardFavoriteButton({ nft, onFeedback }: { nft: Nft; onFeedback: (message: string) => void }) {
  const favorite = useFavoriteToggle(nft, onFeedback)
  return <FavoriteButton variant="card" control={favorite} label={`Favoritar ${nft.name}`} />
}

function NftCard({ nft, onFavoriteFeedback }: { nft: Nft; onFavoriteFeedback?: (message: string) => void }) {
  return (
    <article className="group relative flex flex-col gap-2 md:gap-3">
      <div className="relative flex aspect-[175/200] items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(139.5deg,var(--card)_12%,var(--surface-raised)_106.6%)] px-1 md:aspect-auto md:h-[300px] md:rounded-none md:bg-card md:bg-none">
        <div className="relative w-full max-w-[168px] md:max-w-[250px]">
          <img
            src={nft.image}
            alt=""
            width={250}
            height={250}
            loading="lazy"
            className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none md:rounded-[15px]"
          />
          {onFavoriteFeedback && <CardFavoriteButton nft={nft} onFeedback={onFavoriteFeedback} />}
        </div>
        {nft.isRare && (
          <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center bg-primary px-2 text-[13px] leading-4 font-medium text-primary-foreground">
            RARO
          </span>
        )}
      </div>
      <div className="flex flex-col leading-4 max-md:pl-2 md:gap-1.5">
        <h3 className="text-[15px] leading-normal md:text-base md:leading-4">
          {/* The link covers the whole card; the favorite button sits above it so it isn't nested in the link. */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring md:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 text-base md:text-lg">
          <span className="font-bold text-brand">{formatEth(nft.price)}</span>
          {nft.previousPrice !== undefined && (
            <span className="text-tertiary">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPrice)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-3" aria-hidden>
      <Skeleton className="aspect-[175/200] rounded-[20px] md:aspect-auto md:h-[300px] md:rounded-none" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}

export function SortSelect({ sort, onSortChange, className }: { sort: NftSort; onSortChange: (sort: NftSort) => void; className?: string }) {
  return (
    <label className={cn('flex items-center gap-2 text-[15px]', className)}>
      Ordenar por:
      <span className="relative flex items-center">
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as NftSort)}
          className="cursor-pointer appearance-none rounded-sm bg-transparent pr-7 outline-offset-2"
        >
          {NFT_SORTS.map(({ id, label }) => (
            <option key={id} value={id} className="bg-card">
              {label}
            </option>
          ))}
        </select>
        <img src={arrowDown} alt="" width={11} height={6} className="pointer-events-none absolute right-1" />
      </span>
    </label>
  )
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  const box = 'grid size-[35px] place-items-center rounded-sm border border-border text-lg leading-4 transition-colors hover:border-primary'

  return (
    <nav aria-label="Paginação" className="flex gap-2 self-end">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          aria-current={n === page ? 'page' : undefined}
          aria-label={`Página ${n}`}
          className={cn(box, n === page && 'border-primary bg-primary font-bold text-primary-foreground')}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
        className={cn(box, 'disabled:pointer-events-none disabled:opacity-40')}
      >
        <img src={arrowRight2} alt="" width={12} height={7} className="-rotate-90" />
      </button>
    </nav>
  )
}

export function NftGrid({
  tab,
  sort,
  result,
  isFetching,
  isError,
  hasFilters,
  onTabChange,
  onSortChange,
  onPageChange,
  onRetry,
  onClearFilters,
  onFavoriteFeedback,
}: NftGridProps) {
  return (
    <section id="mercado" aria-labelledby="market-title" className="flex min-w-0 flex-1 flex-col gap-10 md:gap-[88px]">
      <h2 id="market-title" className="sr-only">
        Mercado de NFTs
      </h2>
      <p className="sr-only" role="status">
        {isFetching || !result
          ? 'Carregando NFTs…'
          : `${result.total} ${result.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${result.page} de ${result.totalPages}.`}
      </p>
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Categorias"
            className="flex gap-4 overflow-x-auto pb-2 text-sm leading-4 [scrollbar-width:none] md:gap-5 md:text-[15px] md:font-medium"
          >
            {NFT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => onTabChange(id)}
                className={cn(
                  'relative whitespace-nowrap transition-colors hover:text-brand',
                  tab === id &&
                    'font-bold text-brand after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:bg-primary md:font-medium md:after:-bottom-[7px]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <SortSelect sort={sort} onSortChange={onSortChange} className="max-md:hidden" />
        </div>

        {isError ? (
          <RetryAlert message="Não foi possível carregar os NFTs." onRetry={onRetry} />
        ) : result && result.data.length === 0 ? (
          <InlineAlert
            message="Nenhum NFT encontrado com esses critérios."
            action={hasFilters ? { label: 'Limpar filtros', onClick: onClearFilters } : undefined}
          />
        ) : (
          <div
            aria-busy={isFetching}
            className={cn(
              // Mobile staggers the right column 32px down, as in the design.
              'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 [&>*:nth-child(even)]:translate-y-8',
              'md:gap-x-6 md:gap-y-[72px] md:pb-0 md:[&>*:nth-child(even)]:translate-y-0 xl:grid-cols-[repeat(3,258px)] xl:justify-between',
              isFetching && result && 'opacity-60 transition-opacity',
            )}
          >
            {result ? result.data.map((nft) => <NftCard key={nft.id} nft={nft} onFavoriteFeedback={onFavoriteFeedback} />) : Array.from({ length: 9 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
      </div>

      {result && result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={onPageChange} />
      )}
    </section>
  )
}
