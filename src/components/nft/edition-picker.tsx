import type { NftEdition } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type EditionPickerProps = {
  name: string
  editions: NftEdition[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function EditionPicker({ name, editions, value, onChange, className }: EditionPickerProps) {
  return (
    <fieldset className={className}>
      {/* Floating the legend lets it take margins like a regular block inside the fieldset. */}
      <legend className="float-left mb-3 text-[15px] leading-4 font-bold max-md:mb-2">Edição:</legend>
      <div className="clear-left flex flex-wrap gap-1.5 max-md:gap-3">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label key={edition.id} className={cn('relative', soldOut ? 'cursor-not-allowed' : 'cursor-pointer')}>
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={edition.id === value}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                className="peer sr-only"
              />
              {/* The design draws each option as an ellipse, hence the 50% radius instead of a pill. */}
              <span
                className={cn(
                  'flex h-7 min-w-9 items-center justify-center rounded-[50%] border border-border px-[5px] text-sm leading-4 whitespace-nowrap text-muted-foreground transition-colors',
                  'peer-checked:border-primary peer-checked:font-medium peer-checked:text-brand',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  'peer-disabled:text-tertiary/60 peer-disabled:line-through',
                  !soldOut && 'hover:border-primary/60',
                )}
              >
                {edition.label}
              </span>
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
