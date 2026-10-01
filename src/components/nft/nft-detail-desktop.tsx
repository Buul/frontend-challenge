import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftDetail } from '@/lib/api/types'
import { formatEth, formatReviewCount } from '@/lib/format'
import { EditionPicker } from './edition-picker'
import { FavoriteButton } from './favorite-button'
import { type FavoriteControl } from './favorite-heart'
import { NftGallery } from './nft-gallery'
import { PurchaseNotice } from './purchase-notice'
import { QuantityStepper } from './quantity-stepper'
import { RatingStars } from './rating-stars'
import { ShareLinks } from './share-links'
import type { Purchase } from './use-purchase'

export function Breadcrumb() {
  return (
    <nav aria-label="Você está em">
      <ol className="flex gap-[1ch] text-[15px] leading-4 font-bold">
        <li>
          <Link to="/" className="rounded-sm hover:text-brand">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="mercado" className="rounded-sm hover:text-brand">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

export function TokenFacts({ nft }: { nft: NftDetail }) {
  const facts = [
    { term: 'ID do token:', value: nft.tokenId },
    { term: 'Coleção:', value: nft.collectionName },
    { term: 'Atributos:', value: nft.attributes.join(', ') },
  ]

  return (
    <dl className="flex flex-col gap-3 text-[15px] leading-5 text-tertiary">
      {facts.map(({ term, value }) => (
        <div key={term} className="flex flex-wrap gap-x-[1ch]">
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

type NftDetailDesktopProps = {
  nft: NftDetail
  purchase: Purchase
  favorite: FavoriteControl
  feedback?: string
  shareUrl: string
}

export function NftDetailDesktop({ nft, purchase, favorite, feedback, shareUrl }: NftDetailDesktopProps) {
  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      <NftGallery name={nft.name} images={nft.images} />

      <div className="flex min-w-0 flex-1 flex-col gap-[13px] xl:justify-between">
        <div className="flex flex-col gap-3 hairline-b pb-3 xl:max-w-[573px]">
          <h1 className="text-[28px] leading-normal font-bold">{nft.name}</h1>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-[22px] leading-4 font-bold text-brand">
              <span className="sr-only">Preço: </span>
              {formatEth(nft.price)}
            </p>
            <p className="flex items-center gap-1 text-[15px] leading-5">
              <RatingStars rating={nft.rating} />
              {formatReviewCount(nft.reviewCount)} de colecionadores
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:max-w-[574px]">
          <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
          <p className="text-sm leading-6 text-muted-foreground">{nft.summary}</p>
        </div>

        <EditionPicker name="edition" editions={nft.editions} value={purchase.edition.id} onChange={purchase.selectEdition} />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <QuantityStepper value={purchase.quantity} max={purchase.maxQuantity} onChange={purchase.setQuantity} disabled={purchase.soldOut} />
            <div className="flex gap-2">
              <Button onClick={purchase.buy} disabled={purchase.soldOut} className="h-10 w-[130px] rounded-lg text-sm leading-5 font-bold">
                COMPRAR
              </Button>
              <FavoriteButton variant="labeled" control={favorite} />
            </div>
          </div>
          <PurchaseNotice message={feedback ?? purchase.notice} />
        </div>

        <div className="flex flex-col gap-3">
          <TokenFacts nft={nft} />
          <ShareLinks name={nft.name} url={shareUrl} />
        </div>
      </div>
    </div>
  )
}

export function NftDetailDesktopSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8 xl:flex-row">
      <div className="flex shrink-0 items-center gap-7">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-[100px] rounded-[8px]" />
          ))}
        </div>
        <Skeleton className="size-[444px] rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[13px] xl:justify-between">
        <div className="flex flex-col gap-3 pb-3 xl:max-w-[573px]">
          <Skeleton className="h-[37px] w-2/3" />
          <Skeleton className="h-5 w-full" />
        </div>
        <Skeleton className="h-[94px] w-full xl:max-w-[574px]" />
        <Skeleton className="h-14 w-[209px]" />
        <Skeleton className="h-[50px] w-full" />
        <Skeleton className="h-[114px] w-[308px]" />
      </div>
    </div>
  )
}
