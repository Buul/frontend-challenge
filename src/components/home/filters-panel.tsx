import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { COLLECTIONS, NETWORKS, type NftFacets, type NftQuery } from '@/lib/api/types'
import { fromUnits, toUnits } from '@/lib/eth'
import { formatEthPtBr, formatEthRange } from '@/lib/format'
import { cn } from '@/lib/utils'

const PRICE_DECIMALS = 2

type FilterValues = Pick<NftQuery, 'collection' | 'network' | 'minPrice' | 'maxPrice'>

type FiltersPanelProps = FilterValues & {
  facets?: NftFacets
  onChange: (patch: Partial<FilterValues>) => void
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">{title}</legend>
      {children}
    </fieldset>
  )
}

function FilterOption({
  label,
  count,
  active,
  boldCount,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  boldCount?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex w-full items-start justify-between rounded-sm text-[15px] leading-10 transition-colors hover:text-brand',
        active ? 'text-brand' : 'text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <span className={cn(boldCount && 'font-bold')}>{count === undefined ? '' : `(${count})`}</span>
    </button>
  )
}

export function FiltersPanel({ facets, collection, network, minPrice, maxPrice, onChange }: FiltersPanelProps) {
  const bounds = facets
    ? { min: toUnits(facets.price.min, PRICE_DECIMALS, 'floor'), max: toUnits(facets.price.max, PRICE_DECIMALS, 'ceil') }
    : { min: 0, max: 0 }
  const [draft, setDraft] = useState<number[] | null>(null)
  const price = draft ?? [
    minPrice ? toUnits(minPrice, PRICE_DECIMALS, 'floor') : bounds.min,
    maxPrice ? toUnits(maxPrice, PRICE_DECIMALS, 'ceil') : bounds.max,
  ]

  const applyPrice = () => {
    onChange({
      minPrice: price[0] > bounds.min ? fromUnits(price[0], PRICE_DECIMALS) : undefined,
      maxPrice: price[1] < bounds.max ? fromUnits(price[1], PRICE_DECIMALS) : undefined,
    })
    setDraft(null)
  }

  return (
    <aside aria-label="Filtros" className="flex flex-col gap-10 bg-card p-5">
      <FilterGroup title="Coleções">
        <div className="px-3">
          {COLLECTIONS.map(({ id, label }) => (
            <FilterOption
              key={id}
              label={label}
              count={facets?.collections[id]}
              active={collection === id}
              boldCount
              onClick={() => onChange({ collection: collection === id ? undefined : id })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Faixa de preço">
        <div className="flex flex-col items-start gap-3 pl-3">
          <Slider
            aria-label="Faixa de preço em ETH"
            min={bounds.min}
            max={bounds.max}
            step={1}
            minStepsBetweenValues={1}
            value={price}
            onValueChange={(value) => setDraft(value as number[])}
            getAriaLabel={(index) => (index === 0 ? 'Preço mínimo' : 'Preço máximo')}
            getAriaValueText={(formatted, value) =>
              Number.isInteger(value) ? formatEthPtBr(fromUnits(value, PRICE_DECIMALS)) : formatted
            }
            disabled={!facets}
            className="py-2"
          />
          <p className="text-[15px]" aria-live="polite">
            Preço: {formatEthRange(fromUnits(price[0], PRICE_DECIMALS), fromUnits(price[1], PRICE_DECIMALS))}
          </p>
          <Button onClick={applyPrice} disabled={!facets} className="h-9 rounded-md px-3 text-base leading-5 font-bold">
            Aplicar
          </Button>
        </div>
      </FilterGroup>

      <FilterGroup title="Rede">
        <div className="pl-3">
          {NETWORKS.map(({ id, label }) => (
            <FilterOption
              key={id}
              label={label}
              count={facets?.networks[id]}
              active={network === id}
              onClick={() => onChange({ network: network === id ? undefined : id })}
            />
          ))}
        </div>
      </FilterGroup>
    </aside>
  )
}
