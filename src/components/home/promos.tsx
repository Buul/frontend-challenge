import arrowRight from '@/assets/figma/arrow-right.svg'
import emeraldApe from '@/assets/figma/nft-emerald-ape.jpg'
import neonVessel from '@/assets/figma/nft-neon-vessel.jpg'
import promoMask from '@/assets/figma/promo-mask.svg'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: emeraldApe,
    alt: 'Emerald Ape #042',
    imageClass: '-left-[5px] w-[292px] rounded-[18px]',
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: neonVessel,
    alt: 'Neon Vessel #552',
    imageClass: 'left-0.5 w-[287px] rounded-[17px]',
  },
]

export function Promos() {
  return (
    <section aria-label="Destaques" className="grid gap-7 lg:grid-cols-2">
      {PROMOS.map(({ title, description, image, alt, imageClass }) => (
        <article key={alt} className="relative h-[250px] overflow-hidden rounded-lg bg-card">
          <img
            src={image}
            alt={alt}
            width={292}
            height={250}
            loading="lazy"
            className={cn('absolute top-0 h-[250px] max-w-[50%] object-cover', imageClass)}
          />
          <img src={promoMask} alt="" aria-hidden width={586} height={250} className="pointer-events-none absolute top-0 left-0" />
          <div className="relative ml-auto flex h-full w-1/2 flex-col items-end pt-[37px] pr-[30px] text-right sm:w-[300px]">
            <h3 className="text-lg leading-6 font-bold">
              {title[0]}
              <br />
              {title[1]}
            </h3>
            <p className="mt-2 max-w-[263px] text-sm leading-6 text-muted-foreground">{description}</p>
            <Button
              nativeButton={false}
              render={<a href="#mercado" />}
              className="mt-auto mb-[46px] h-10 w-[140px] gap-4 rounded-md text-sm leading-5 font-medium"
            >
              Explorar
              <span className="sr-only">
                : {title[0]} {title[1]}
              </span>
              <img src={arrowRight} alt="" width={11} height={13} className="-rotate-90" />
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}
