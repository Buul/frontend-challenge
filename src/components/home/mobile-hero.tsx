import arrowRight from '@/assets/figma/arrow-right-primary.svg'
import heroMask from '@/assets/figma/hero-mask-mobile.svg'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeaturedCarousel } from '@/hooks/use-featured-carousel'
import type { FeaturedNft } from '@/lib/api/types'
import { SlideDots } from './hero'

type MobileHeroProps = {
  slides?: FeaturedNft[]
  isError: boolean
  onRetry: () => void
}

function Artwork({ slides, active, isError, onRetry }: MobileHeroProps & { active: number }) {
  if (!slides) {
    return isError ? (
      <RetryAlert message="Não foi possível carregar os destaques." onRetry={onRetry} className="items-center bg-transparent p-0 text-center" />
    ) : (
      <Skeleton className="aspect-square w-full rounded-2xl" />
    )
  }

  const main = slides[active]
  const secondary = slides.length > 1 ? slides[(active + 1) % slides.length] : undefined

  return (
    <>
      <img
        key={main.id}
        src={main.image}
        alt={main.imageAlt}
        width={138}
        height={138}
        fetchPriority="high"
        className="aspect-square w-full rounded-2xl object-cover"
      />
      {secondary && (
        <img
          key={secondary.id}
          src={secondary.image}
          alt=""
          width={58}
          height={58}
          className="absolute top-[64%] left-[10%] aspect-square w-[42%] rounded-2xl object-cover"
        />
      )}
    </>
  )
}

export function MobileHero({ slides, isError, onRetry }: MobileHeroProps) {
  const { active, select, liveText } = useFeaturedCarousel(slides)

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[190px] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl p-4"
    >
      <img src={heroMask} alt="" width={366} height={190} className="absolute inset-0 size-full" />

      <div className="relative flex w-full items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="max-w-[190px] text-lg leading-[29px] font-bold">
              SEJA DONO DA CULTURA DIGITAL
            </h1>
            <p className="text-xs leading-[18px] text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
          </div>
          <a href="#mercado" className="flex items-center gap-2 rounded-sm text-xs leading-[14px] font-bold text-brand">
            EXPLORAR
            <span className="grid size-4 place-items-center">
              <img src={arrowRight} alt="" width={9.53} height={11.5} className="-rotate-90" />
            </span>
          </a>
        </div>

        <div
          role="region"
          aria-roledescription="carrossel"
          aria-label="NFTs em destaque"
          className="relative grid w-[clamp(104px,34vw,138px)] shrink-0 place-items-center"
        >
          <Artwork slides={slides} active={active} isError={isError} onRetry={onRetry} />
          <p className="sr-only" aria-live="polite">
            {liveText}
          </p>
        </div>
      </div>

      <div className="relative h-[7px]">
        {slides && slides.length > 1 && <SlideDots compact slides={slides} active={active} onSelect={select} />}
      </div>
    </section>
  )
}
