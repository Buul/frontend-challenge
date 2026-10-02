import { Link } from '@tanstack/react-router'

/** "Início / Mercado / <current>", shared by the market flow (detail, cart, payment). */
export function Breadcrumb({ current }: { current?: string }) {
  return (
    <nav aria-label="Você está em">
      <ol className="flex flex-wrap gap-[1ch] text-[15px] leading-4 font-bold">
        <li>
          <Link to="/" className="rounded-sm hover:text-brand">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="mercado" className="rounded-sm hover:text-brand">
            Mercado
          </Link>
        </li>
        {current && (
          <>
            <li aria-hidden>/</li>
            <li aria-current="page">{current}</li>
          </>
        )}
      </ol>
    </nav>
  )
}
