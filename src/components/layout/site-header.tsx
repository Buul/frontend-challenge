import { Link, useSearch } from '@tanstack/react-router'
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

export type NavSection = 'home' | 'market'

// Items without a `hash` (other than home) have no destination yet, so they render as plain text instead of dead links.
const NAV_ITEMS: { id: string; label: string; hash?: string }[] = [
  { id: 'home', label: 'Início' },
  { id: 'market', label: 'Mercado', hash: 'mercado' },
  { id: 'creators', label: 'Criadores' },
  { id: 'learn', label: 'Aprenda', hash: 'blog' },
]

const navItemClass = (active: boolean) =>
  active
    ? 'flex flex-col gap-6 font-bold whitespace-nowrap text-brand after:h-[3px] after:w-full after:bg-primary'
    : 'pb-[27px] whitespace-nowrap'

function HeaderSearch() {
  const onSubmit = useSearchSubmit()
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
        onClick={open ? undefined : () => setOpen(true)}
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
  return (
    <header className={bordered ? 'hairline-b' : undefined}>
      <SkipLink />
      <div className="flex flex-wrap items-start justify-between gap-y-4">
        <Link to="/" className="w-40 py-2 text-sm font-bold tracking-[1.4px]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="order-last flex w-full gap-10 overflow-x-auto md:order-none md:w-auto">
          {NAV_ITEMS.map(({ id, label, hash }) => {
            const isActive = id === active
            if (id !== 'home' && !hash) {
              return (
                <span key={id} className={navItemClass(isActive)}>
                  {label}
                </span>
              )
            }
            return (
              <Link
                key={id}
                to="/"
                hash={hash}
                activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
                className={`${navItemClass(isActive)} ${isActive ? '' : 'hover:text-brand'}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-7">
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
