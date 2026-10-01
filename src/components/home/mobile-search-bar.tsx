import { useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import filterIcon from '@/assets/figma/filter.svg'
import searchIcon from '@/assets/figma/search-secondary.svg'
import { SkipLink } from '@/components/layout/site-header'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSearchSubmit } from '@/hooks/use-search-submit'
import { NFT_SEARCH_MAX_LENGTH } from '@/lib/api/types'

type MobileSearchBarProps = {
  activeFilters: number
  /** Rendered inside the filters sheet opened by the button next to the search field. */
  filters: ReactNode
}

export function MobileSearchBar({ activeFilters, filters }: MobileSearchBarProps) {
  const onSubmit = useSearchSubmit()
  const { q } = useSearch({ strict: false })

  return (
    <header className="flex items-center gap-2">
      <SkipLink />
      <form
        role="search"
        onSubmit={onSubmit}
        className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
      >
        <img src={searchIcon} alt="" width={22} height={22} className="shrink-0" />
        <label htmlFor="mobile-search" className="sr-only">
          Buscar NFTs por nome
        </label>
        <input
          key={q}
          id="mobile-search"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={q}
          maxLength={NFT_SEARCH_MAX_LENGTH}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold outline-none placeholder:text-tertiary"
        />
      </form>

      <Sheet>
        <SheetTrigger
          aria-label={activeFilters > 0 ? `Filtros, ${activeFilters} ativos` : 'Filtros'}
          className="relative grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgb(210_138_76/0.45)_24.6%,var(--primary)_100%)]"
        >
          <span className="grid size-[22px] place-items-center">
            <img src={filterIcon} alt="" width={16.15} height={16.11} />
          </span>
          {activeFilters > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-brand text-[10px] leading-none font-medium text-primary-foreground ring-2 ring-background"
            >
              {activeFilters}
            </span>
          )}
        </SheetTrigger>
        <SheetContent>
          <div className="sticky top-0 z-10 flex items-center justify-between bg-card px-5 pt-5 pb-2">
            <SheetTitle>Filtros</SheetTitle>
            <SheetClose className="rounded-sm text-sm font-bold text-brand">Fechar</SheetClose>
          </div>
          {filters}
        </SheetContent>
      </Sheet>
    </header>
  )
}
