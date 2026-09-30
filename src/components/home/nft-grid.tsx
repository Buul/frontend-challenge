import arrowDown from '@/assets/figma/arrow-down.svg'
import arrowRight2 from '@/assets/figma/arrow-right-2.svg'
import { Button } from '@/components/ui/button'
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
}

function NftCard({ nft }: { nft: Nft }) {
  return (
    <article className="flex flex-col gap-3">
      <div className="flex h-[300px] items-center justify-center bg-card px-1">
        <img
          src={nft.image}
          alt={nft.name}
          width={250}
          height={250}
          loading="lazy"
          className="aspect-square w-full max-w-[250px] rounded-[15px] object-cover"
        />
      </div>
      <div className="flex flex-col gap-1.5 leading-4">
        <h3 className="text-base">{nft.name}</h3>
        <p className="flex items-center gap-3 text-lg">
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
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-[300px] animate-pulse bg-card motion-reduce:animate-none" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-card motion-reduce:animate-none" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-card motion-reduce:animate-none" />
    </div>
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
}: NftGridProps) {
  return (
    <section id="mercado" aria-labelledby="market-title" className="flex min-w-0 flex-1 flex-col gap-[88px]">
      <h2 id="market-title" className="sr-only">
        Mercado de NFTs
      </h2>
      <p className="sr-only" role="status">
        {isFetching || !result
          ? 'Carregando NFTs…'
          : `${result.total} ${result.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${result.page} de ${result.totalPages}.`}
      </p>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label="Categorias" className="flex gap-5 overflow-x-auto pb-2 text-[15px] leading-4 font-medium">
            {NFT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => onTabChange(id)}
                className={cn(
                  'relative whitespace-nowrap transition-colors hover:text-brand',
                  tab === id && 'text-brand after:absolute after:inset-x-0 after:-bottom-[7px] after:h-0.5 after:bg-primary',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[15px]">
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
        </div>

        {isError ? (
          <div role="alert" className="flex flex-col items-start gap-4 bg-card p-8">
            <p className="text-muted-foreground">Não foi possível carregar os NFTs.</p>
            <Button onClick={onRetry} className="rounded-md font-bold">
              Tentar novamente
            </Button>
          </div>
        ) : result && result.data.length === 0 ? (
          <div className="flex flex-col items-start gap-4 bg-card p-8">
            <p className="text-muted-foreground">Nenhum NFT encontrado com esses critérios.</p>
            {hasFilters && (
              <Button onClick={onClearFilters} className="rounded-md font-bold">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div
            aria-busy={isFetching}
            className={cn(
              'grid gap-x-6 gap-y-[72px] sm:grid-cols-2 xl:grid-cols-[repeat(3,258px)] xl:justify-between',
              isFetching && result && 'opacity-60 transition-opacity',
            )}
          >
            {result ? result.data.map((nft) => <NftCard key={nft.id} nft={nft} />) : Array.from({ length: 9 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
      </div>

      {result && result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={onPageChange} />
      )}
    </section>
  )
}
