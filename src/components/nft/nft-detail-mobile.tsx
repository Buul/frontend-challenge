import type { ReactNode } from 'react'
import arrowBack from '@/assets/figma/arrow-back.svg'
import shopIcon from '@/assets/figma/shop.svg'
import starIcon from '@/assets/figma/star-amber.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { useSnapCarousel } from '@/hooks/use-snap-carousel'
import type { NftDetail, NftImage } from '@/lib/api/types'
import { formatEth, formatRating, formatReviewCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TokenFacts } from './nft-detail-desktop'
import { EditionPicker } from './edition-picker'
import { FavoriteButton } from './favorite-button'
import { type FavoriteControl } from './favorite-heart'
import { QuantityStepper } from './quantity-stepper'
import { PurchaseNotice } from './purchase-notice'
import type { Purchase } from './use-purchase'

/** Space reserved below the page so the fixed buy bar never covers content. */
export const MOBILE_BUY_BAR_HEIGHT = 188

const circleButton = 'grid size-[35px] place-items-center rounded-full border border-border bg-surface-raised'

function Gallery({ images }: { images: NftImage[] }) {
  const { ref, page, pages, scrollToPage } = useSnapCarousel<HTMLUListElement>(images.length)

  return (
    <div className="relative">
      <ul ref={ref} aria-label="Imagens do NFT" className="flex snap-x snap-mandatory overflow-x-auto rounded-[24px] [scrollbar-width:none]">
        {images.map((image, index) => (
          <li key={index} className="w-full shrink-0 snap-center">
            <img
              src={image.src}
              alt={image.alt}
              width={361}
              height={356}
              fetchPriority={index === 0 ? 'high' : undefined}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="h-[356px] w-full object-cover"
            />
          </li>
        ))}
      </ul>
      {pages > 1 && (
        // Sits just above where the details sheet overlaps the artwork, as in the design.
        <div role="group" aria-label="Escolher imagem" className="absolute top-[299px] left-1/2 flex -translate-x-1/2 gap-[7px]">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Imagem ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => scrollToPage(index)}
              className={cn(
                'relative h-[7px] rounded-full bg-primary transition-all before:absolute before:-inset-2 motion-reduce:transition-none',
                index === page ? 'w-7' : 'w-[7px] opacity-60',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Hero({ onBack, favorite, children }: { onBack: () => void; favorite?: FavoriteControl; children: ReactNode }) {
  return (
    <div className="flex h-[506px] flex-col gap-2 bg-[linear-gradient(137.64deg,var(--card)_12%,var(--surface-raised)_106.59%)] px-7 pt-[23px]">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Voltar" onClick={onBack} className={circleButton}>
          <span className="grid size-5 place-items-center">
            <img src={arrowBack} alt="" width={13.17} height={7.33} className="rotate-90" />
          </span>
        </button>
        {favorite && <FavoriteButton variant="circle" control={favorite} />}
      </div>
      {children}
    </div>
  )
}

function BuyBar({ purchase, feedback }: { purchase: Purchase; feedback?: string }) {
  const message = feedback ?? purchase.notice

  return (
    <div
      role="region"
      aria-label="Compra"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-card px-6 pt-5 pb-[calc(36px+env(safe-area-inset-bottom))] shadow-[0_0_10px_rgba(10,6,4,0.45)]"
    >
      <div className="mx-auto flex max-w-[366px] flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-[15px] leading-4 font-medium text-muted-foreground">
                Qtd.
              </span>
              <QuantityStepper size="sm" value={purchase.quantity} max={purchase.maxQuantity} onChange={purchase.setQuantity} disabled={purchase.soldOut} />
            </div>
            <p className="text-xl leading-4 font-bold text-brand">
              <span className="sr-only">Total: </span>
              {formatEth(purchase.total)}
            </p>
          </div>
          <PurchaseNotice message={message} />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={purchase.buy}
            disabled={purchase.soldOut}
            className="flex h-[60px] w-[196px] items-center justify-center rounded-[40px] bg-[linear-gradient(100.37deg,var(--primary)_3.96%,color-mix(in_srgb,var(--primary)_80%,transparent)_121.97%)] text-base leading-5 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            onClick={purchase.buy}
            disabled={purchase.soldOut}
            className="grid size-[60px] place-items-center rounded-full border border-border bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid size-5 place-items-center">
              <img src={shopIcon} alt="" width={17.5} height={16.67} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

type NftDetailMobileProps = {
  nft: NftDetail
  purchase: Purchase
  favorite: FavoriteControl
  feedback?: string
  onBack: () => void
}

export function NftDetailMobile({ nft, purchase, favorite, feedback, onBack }: NftDetailMobileProps) {
  return (
    <>
      <Hero onBack={onBack} favorite={favorite}>
        <Gallery images={nft.images} />
      </Hero>

      <div className="relative -mt-[114px] flex flex-col gap-3 rounded-t-[31px] bg-card px-6 pt-8 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-xl leading-6 font-bold">{nft.name}</h1>
          <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-[32px] border border-primary px-[5.5px] text-sm leading-4">
            <span className="sr-only">
              Avaliação {formatRating(nft.rating)} de 5, {formatReviewCount(nft.reviewCount)}
            </span>
            <span aria-hidden className="grid size-[14px] place-items-center">
              <img src={starIcon} alt="" width={11.67} height={11.08} />
            </span>
            <span aria-hidden className="font-medium">
              {formatRating(nft.rating)}
              <span className="font-normal text-muted-foreground">({nft.reviewCount})</span>
            </span>
          </p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{nft.summary}</p>
        <p className="sr-only">Preço por unidade: {formatEth(nft.price)}</p>
        <EditionPicker name="edition" editions={nft.editions} value={purchase.edition.id} onChange={purchase.selectEdition} />
        <TokenFacts nft={nft} />
      </div>

      <BuyBar purchase={purchase} feedback={feedback} />
    </>
  )
}

export function NftDetailMobileSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Hero onBack={onBack}>
        <Skeleton className="h-[356px] w-full rounded-[24px]" />
      </Hero>
      <div aria-hidden className="relative -mt-[114px] flex flex-col gap-3 rounded-t-[31px] bg-card px-6 pt-8 pb-6">
        <Skeleton className="h-[27px] w-full bg-surface-raised" />
        <Skeleton className="h-[71px] w-full bg-surface-raised" />
        <Skeleton className="h-[52px] w-56 bg-surface-raised" />
        <Skeleton className="h-[84px] w-64 bg-surface-raised" />
      </div>
    </>
  )
}
