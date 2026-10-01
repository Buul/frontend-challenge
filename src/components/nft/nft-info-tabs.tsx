import { Tabs } from '@base-ui/react/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftDetail } from '@/lib/api/types'
import { formatDate, formatRating, formatReviewCount, shortenAddress } from '@/lib/format'
import { RatingStars } from './rating-stars'

const tab =
  'relative pb-3 text-[17px] leading-4 whitespace-nowrap transition-colors hover:text-brand data-[active]:font-bold data-[active]:text-brand data-[active]:after:absolute data-[active]:after:inset-x-0 data-[active]:after:bottom-0 data-[active]:after:h-[3px] data-[active]:after:bg-primary'

function DetailsPanel({ nft }: { nft: NftDetail }) {
  const facts = [
    { term: 'Rede:', value: nft.provenance },
    {
      term: 'Contrato:',
      value: (
        <>
          <span title={nft.contract.address}>{shortenAddress(nft.contract.address)}</span> • Contrato inteligente{' '}
          {nft.contract.standard} verificado.
        </>
      ),
    },
    {
      term: 'Direitos autorais:',
      value: `${nft.royaltyPercent}% para ${nft.creator} nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`,
    },
  ]

  return (
    <div className="flex flex-col gap-3 text-sm leading-6">
      <div className="flex flex-col gap-6 text-muted-foreground">
        {nft.description.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <dl className="flex flex-col gap-3">
        {facts.map(({ term, value }) => (
          <div key={term}>
            <dt className="font-bold">{term}</dt>
            <dd className="text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ReviewsPanel({ nft }: { nft: NftDetail }) {
  if (nft.reviews.length === 0) {
    return <p className="text-sm leading-6 text-muted-foreground">Este NFT ainda não recebeu avaliações de colecionadores.</p>
  }

  return (
    <div className="flex flex-col gap-6 text-sm leading-6">
      <p className="flex flex-wrap items-center gap-3">
        <RatingStars rating={nft.rating} />
        <span>
          <span className="font-bold">{formatRating(nft.rating)}</span> de 5 · {formatReviewCount(nft.reviewCount)}
        </span>
      </p>
      <ul className="flex flex-col gap-6">
        {nft.reviews.map((review) => (
          <li key={review.id} className="flex flex-col gap-2 border-b-[0.3px] border-border pb-6 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-bold">{review.author}</p>
              <RatingStars rating={review.rating} />
              <time dateTime={review.createdAt} className="text-tertiary">
                {formatDate(review.createdAt)}
              </time>
            </div>
            <p className="text-muted-foreground">{review.comment}</p>
          </li>
        ))}
      </ul>
      {nft.reviewCount > nft.reviews.length && (
        <p className="text-tertiary">
          Exibindo as {nft.reviews.length} avaliações mais recentes de {nft.reviewCount}.
        </p>
      )}
    </div>
  )
}

export function NftInfoTabs({ nft }: { nft?: NftDetail }) {
  if (!nft) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-full max-w-[530px]" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[132px] w-full max-w-[640px]" />
      </div>
    )
  }

  return (
    <Tabs.Root defaultValue="details" className="flex flex-col gap-3">
      <Tabs.List aria-label="Informações do NFT" className="flex gap-8 overflow-x-auto hairline-b [scrollbar-width:none]">
        <Tabs.Tab value="details" className={tab}>
          Detalhes do NFT
        </Tabs.Tab>
        <Tabs.Tab value="reviews" className={tab}>
          Avaliações <span className="max-md:sr-only">de colecionadores</span> ({nft.reviewCount})
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="details" className="rounded-sm">
        <DetailsPanel nft={nft} />
      </Tabs.Panel>
      <Tabs.Panel value="reviews" className="rounded-sm">
        <ReviewsPanel nft={nft} />
      </Tabs.Panel>
    </Tabs.Root>
  )
}
