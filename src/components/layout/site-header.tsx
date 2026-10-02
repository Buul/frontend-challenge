import { Link, useRouterState, useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import cartIcon from '@/assets/figma/cart.svg'
import loginIcon from '@/assets/figma/login.svg'
import searchIcon from '@/assets/figma/search.svg'
import { AccountMenu } from '@/components/auth/account-menu'
import { NftSearchField } from '@/components/layout/nft-search-field'
import { SkipLink } from '@/components/layout/skip-link'
import { Button } from '@/components/ui/button'
import { cartLabel, CountBadge } from '@/components/ui/count-badge'
import { useSearchSubmit } from '@/hooks/use-search-submit'
import { useCart } from '@/lib/api/cart'
import { cn } from '@/lib/utils'

export type NavSection = 'home' | 'market'

const NAV_ITEMS: { id: 'home' | 'market' | 'creators' | 'learn'; label: string; hash?: string }[] = [
  { id: 'home', label: 'Início' },
  { id: 'market', label: 'Mercado', hash: 'mercado' },
  { id: 'creators', label: 'Criadores', hash: 'criadores' },
  { id: 'learn', label: 'Aprenda', hash: 'blog' },
]

const SECTION_BY_HASH: Record<string, (typeof NAV_ITEMS)[number]['id']> = {
  mercado: 'market',
  criadores: 'creators',
  blog: 'learn',
}

const navItemClass = (active: boolean) =>
  cn(
    'relative shrink-0 py-3 whitespace-nowrap',
    active
      ? 'font-bold text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary'
      : 'hover:text-brand',
  )

function HeaderSearch() {
  const onSubmit = useSearchSubmit({ scrollToMarket: false })
  const { q } = useSearch({ strict: false })
  const [open, setOpen] = useState(Boolean(q))
  const toggle = useRef<HTMLButtonElement>(null)

  const close = () => {
    toggle.current?.focus()
    setOpen(false)
  }

  return (
    <form role="search" className="flex items-center gap-2" onSubmit={onSubmit}>
      {open && (
        <NftSearchField
          id="site-search"
          autoFocus
          placeholder="Buscar NFTs..."
          onEscape={close}
          className="h-[35px] w-40 rounded-md bg-card px-3 text-sm outline-none placeholder:text-tertiary focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
        />
      )}
      <button
        ref={toggle}
        type={open ? 'submit' : 'button'}
        // React re-renders this button as `submit` within the same click, so the opening click must not submit
        // the (still empty) search, which would navigate away from the current page.
        onClick={
          open
            ? undefined
            : (event) => {
                event.preventDefault()
                setOpen(true)
              }
        }
        aria-label={open ? 'Enviar busca' : 'Abrir busca'}
        className="rounded-sm hover:opacity-80"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    </form>
  )
}

type SiteHeaderProps = {
  /** Nav item highlighted for the current screen; the Mercado flow (detail, cart, checkout) uses `market`. */
  active?: NavSection
  /** Hairline under the header, present on the home frame but not on the Mercado-flow frames. */
  bordered?: boolean
}

export function SiteHeader({ active = 'home', bordered = true }: SiteHeaderProps) {
  const cartCount = useCart().data?.itemCount ?? 0
  const { pathname, hash } = useRouterState({
    select: (state) => ({ pathname: state.location.pathname, hash: state.location.hash.replace(/^#/, '') }),
  })
  const current = pathname === '/' ? (SECTION_BY_HASH[hash] ?? 'home') : active

  return (
    <header className={bordered ? 'hairline-b' : undefined}>
      <SkipLink />
      {/* The fixed logo width centers the nav on desktop; on tablets every pixel goes to the nav. While the search
          is open below 1024 px it takes the nav's place, so nothing is clipped. */}
      <div className="group/header flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0 py-2 text-sm font-bold tracking-[1.4px] lg:w-40" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav
          aria-label="Principal"
          className="flex min-w-0 flex-1 items-center justify-center gap-5 overflow-x-auto lg:gap-6 xl:gap-10 max-lg:group-has-[#site-search]/header:hidden"
        >
          {NAV_ITEMS.map(({ id, label, hash: itemHash }) => (
            <Link
              key={id}
              to="/"
              hash={itemHash}
              activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
              className={navItemClass(id === current)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4 max-lg:group-has-[#site-search]/header:ml-auto xl:gap-7">
          <HeaderSearch />
          <Link to="/cart" aria-label={cartLabel(cartCount)} className="relative rounded-sm hover:opacity-80">
            <img src={cartIcon} alt="" width={24} height={24} />
            <CountBadge count={cartCount} className="absolute top-0 left-[15px] bg-primary" />
          </Link>
          <AccountMenu
            renderLogin={({ onClick }) => (
              <Button onClick={onClick} className="h-[35px] w-[100px] gap-1 rounded-md text-base font-medium">
                <img src={loginIcon} alt="" width={18} height={17} />
                Entrar
              </Button>
            )}
            trigger={(name) => (
              <button
                type="button"
                aria-label={`Conta de ${name}`}
                className="h-[35px] max-w-40 truncate rounded-md border border-primary px-3 text-base font-medium text-brand hover:bg-primary/10"
              >
                {name.split(' ')[0]}
              </button>
            )}
          />
        </div>
      </div>
    </header>
  )
}
