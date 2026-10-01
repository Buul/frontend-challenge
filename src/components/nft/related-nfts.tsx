import { Link } from '@tanstack/react-router'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useSnapCarousel } from '@/hooks/use-snap-carousel'
import type { Nft } from '@/lib/api/types'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

const list = 'flex w-full gap-4 md:gap-[26px]'
// Five cards fill one page exactly at desktop widths (219px each in the 1200px design).
const item = 'w-[160px] shrink-0 md:w-[219px] xl:w-[calc((100%-4*26px)/5)]'

function RelatedCard({ nft }: { nft: Nft }) {
  return (
    <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group flex flex-col gap-3 rounded-sm">
      <div className="flex aspect-[219/255] items-start justify-center bg-card px-1 pt-[9%]">
        <img
          src={nft.image}
          alt=""
          width={212}
          height={212}
          loading="lazy"
          className="aspect-square w-full rounded-[13px] object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-col">
        <h3 className="text-[15px] leading-normal">{nft.name}</h3>
        <p className="text-base leading-4 font-bold text-brand">{formatEth(nft.price)}</p>
      </div>
    </Link>
  )
}

function Carousel({ nfts }: { nfts: Nft[] }) {
  const { ref, page, pages, scrollToPage } = useSnapCarousel<HTMLUListElement>(nfts.length)

  return (
    <div className="flex flex-col items-center gap-8">
      <ul ref={ref} className={cn(list, 'snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]')}>
        {nfts.map((nft) => (
          <li key={nft.id} className={cn(item, 'snap-start')}>
            <RelatedCard nft={nft} />
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div role="group" aria-label="Páginas de NFTs relacionados" className="flex gap-2">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => scrollToPage(index)}
              className={cn(
                'relative size-3 rounded-full border border-primary transition-colors before:absolute before:-inset-1.5',
                index === page ? 'bg-primary' : 'hover:bg-primary/40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type RelatedNftsProps = {
  nfts?: Nft[]
  isError: boolean
  onRetry: () => void
}

export function RelatedNfts({ nfts, isError, onRetry }: RelatedNftsProps) {
  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <h2 id="related-title" className="hairline-b pb-3 text-[17px] leading-4 font-bold text-brand">
        Mais desta coleção
      </h2>
      {nfts ? (
        nfts.length > 0 ? (
          <Carousel nfts={nfts} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum outro NFT desta coleção está à venda no momento.</p>
        )
      ) : isError ? (
        <RetryAlert message="Não foi possível carregar os NFTs desta coleção." onRetry={onRetry} />
      ) : (
        <ul aria-hidden className={cn(list, 'overflow-hidden pb-11')}>
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} className={cn(item, 'flex flex-col gap-3')}>
              <Skeleton className="aspect-[219/255] rounded-none" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
