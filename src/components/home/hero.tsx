import { useRef, useState, type KeyboardEvent } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import type { FeaturedNft } from '@/lib/api/types'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

type HeroProps = {
  slides?: FeaturedNft[]
  isError: boolean
  onRetry: () => void
}

function SlideDots({ slides, active, onSelect }: { slides: FeaturedNft[]; active: number; onSelect: (index: number) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: KeyboardEvent) => {
    const last = slides.length - 1
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onSelect(next)
    buttons.current[next]?.focus()
  }

  return (
    <div role="group" aria-label="Escolher NFT em destaque" className="flex h-6" onKeyDown={handleKeyDown}>
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          ref={(element) => {
            buttons.current[index] = element
          }}
          type="button"
          tabIndex={index === active ? 0 : -1}
          aria-label={`Destaque ${index + 1} de ${slides.length}: ${slide.name}`}
          aria-current={index === active ? 'true' : undefined}
          onClick={() => onSelect(index)}
          className="group flex items-center rounded-full px-1"
        >
          <span
            className={cn(
              'block h-2 rounded-full bg-primary transition-all motion-reduce:transition-none',
              index === active ? 'w-5' : 'w-2 opacity-40 group-hover:opacity-80',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function Hero({ slides, isError, onRetry }: HeroProps) {
  const [active, setActive] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const current = slides?.[active]

  const select = (index: number) => {
    setActive(index)
    setInteracted(true)
  }

  return (
    <section aria-labelledby="hero-title" className="flex flex-col-reverse items-center gap-10 lg:h-[450px] lg:flex-row lg:justify-between lg:pl-10">
      <div className="flex w-full max-w-[600px] flex-col items-end gap-11">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-4 font-medium tracking-[1.4px]">Bem-vindo à Kurio</p>
              <h1 id="hero-title" className="text-3xl leading-tight font-bold sm:text-[43px] sm:leading-[70px]">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
            </div>
            <p className="max-w-[557px] text-sm leading-6 text-muted-foreground">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </p>
          </div>
          <a href="#mercado" className={cn(buttonVariants(), 'h-10 w-[140px] rounded-md text-base leading-5 font-bold')}>
            EXPLORAR
          </a>
        </div>
        <div className="h-6">
          {slides && slides.length > 1 && <SlideDots slides={slides} active={active} onSelect={select} />}
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="carrossel"
        aria-label="NFTs em destaque"
        className="relative aspect-square w-full max-w-[450px] shrink-0 overflow-hidden rounded-3xl bg-card"
      >
        {slides?.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.imageAlt}
            aria-hidden={index !== active}
            width={450}
            height={450}
            fetchPriority={index === 0 ? 'high' : undefined}
            loading={index === 0 ? 'eager' : 'lazy'}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none',
              index === active ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}

        {!slides && !isError && <div aria-hidden className="absolute inset-0 animate-pulse bg-card motion-reduce:animate-none" />}

        {!slides && isError && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted-foreground">Não foi possível carregar os destaques.</p>
            <Button onClick={onRetry} className="rounded-md font-bold">
              Tentar novamente
            </Button>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {interacted && slides && current ? `Destaque ${active + 1} de ${slides.length}: ${current.name}, ${formatEth(current.price)}` : ''}
        </p>
      </div>
    </section>
  )
}
