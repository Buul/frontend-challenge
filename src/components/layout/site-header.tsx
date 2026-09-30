import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import cartIcon from '@/assets/figma/cart.svg'
import loginIcon from '@/assets/figma/login.svg'
import searchIcon from '@/assets/figma/search.svg'
import { Button } from '@/components/ui/button'
import { NFT_SEARCH_MAX_LENGTH } from '@/lib/api/types'

// Sections without a `hash` have no destination yet, so they render as plain text instead of dead links.
const NAV_SECTIONS: { label: string; hash?: string }[] = [
  { label: 'Mercado', hash: 'mercado' },
  { label: 'Criadores' },
  { label: 'Aprenda', hash: 'blog' },
]

function HeaderSearch() {
  const navigate = useNavigate()
  const { q } = useSearch({ strict: false })
  const [open, setOpen] = useState(Boolean(q))
  const toggle = useRef<HTMLButtonElement>(null)

  const close = () => {
    toggle.current?.focus()
    setOpen(false)
  }

  return (
    <form
      role="search"
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const value = String(new FormData(event.currentTarget).get('q') ?? '').trim()
        void navigate({
          to: '/',
          search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
          hash: 'mercado',
        })
      }}
    >
      {open && (
        <>
          <label htmlFor="site-search" className="sr-only">
            Buscar NFTs por nome
          </label>
          <input
            key={q}
            id="site-search"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={NFT_SEARCH_MAX_LENGTH}
            autoFocus
            placeholder="Buscar NFTs..."
            onKeyDown={(event) => event.key === 'Escape' && close()}
            className="h-[35px] w-40 rounded-md bg-card px-3 text-sm outline-none placeholder:text-tertiary focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          />
        </>
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

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="border-b-[0.3px] border-primary">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      <div className="flex flex-wrap items-start justify-between gap-y-4">
        <Link to="/" className="w-40 py-2 text-sm font-bold tracking-[1.4px]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="order-last flex w-full gap-10 overflow-x-auto md:order-none md:w-auto">
          <Link
            to="/"
            activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
            className="flex flex-col gap-6 font-bold text-brand after:h-[3px] after:w-full after:bg-primary"
          >
            Início
          </Link>
          {NAV_SECTIONS.map(({ label, hash }) =>
            hash ? (
              <Link
                key={label}
                to="/"
                hash={hash}
                activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
                className="pb-[27px] whitespace-nowrap hover:text-brand"
              >
                {label}
              </Link>
            ) : (
              <span key={label} className="pb-[27px] whitespace-nowrap">
                {label}
              </span>
            ),
          )}
        </nav>

        <div className="flex items-center gap-7">
          <HeaderSearch />
          <button
            type="button"
            aria-label={cartCount > 0 ? `Carrinho, ${cartCount} itens` : 'Carrinho vazio'}
            className="relative rounded-sm hover:opacity-80"
          >
            <img src={cartIcon} alt="" width={24} height={24} />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute top-0 left-[15px] grid size-4 place-items-center rounded-full bg-primary text-[10px] leading-none font-medium text-primary-foreground ring-2 ring-background"
              >
                {cartCount}
              </span>
            )}
          </button>
          <Button className="h-[35px] w-[100px] gap-1 rounded-md text-base font-medium">
            <img src={loginIcon} alt="" width={18} height={17} />
            Entrar
          </Button>
        </div>
      </div>
    </header>
  )
}
