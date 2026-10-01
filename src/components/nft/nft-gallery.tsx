import { useState } from 'react'
import zoomIcon from '@/assets/figma/detail-zoom.svg'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { NftImage } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export function NftGallery({ name, images }: { name: string; images: NftImage[] }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  return (
    <div className="flex shrink-0 items-center gap-7">
      <ul aria-label="Imagens do NFT" className="flex w-[100px] shrink-0 flex-col gap-4">
        {images.map((image, index) => (
          <li key={index}>
            <button
              type="button"
              aria-label={`Mostrar imagem ${index + 1} de ${images.length}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={cn(
                'block size-[100px] overflow-hidden rounded-[8px] border bg-card transition-colors',
                index === active ? 'border-primary' : 'border-transparent hover:border-primary/50',
              )}
            >
              <img src={image.src} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative grid size-[444px] shrink-0 place-items-center rounded-lg bg-card">
        <img
          src={current.src}
          alt={current.alt}
          width={404}
          height={404}
          fetchPriority="high"
          className="size-[404px] rounded-[24px] object-cover"
        />
        <Dialog>
          <DialogTrigger aria-label="Ampliar imagem" className="absolute top-[13px] right-3 rounded-full transition-opacity hover:opacity-80">
            <img src={zoomIcon} alt="" width={30} height={30} />
          </DialogTrigger>
          <DialogContent className="gap-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{name}</DialogTitle>
              <DialogClose render={<Button variant="outline" className="rounded-lg" />}>Fechar</DialogClose>
            </div>
            <img src={current.src} alt={current.alt} width={720} height={720} className="max-h-[75svh] w-full rounded-[24px] object-contain" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
