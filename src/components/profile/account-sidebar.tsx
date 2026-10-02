import { Link } from '@tanstack/react-router'
import activityIcon from '@/assets/figma/profile-activity.svg'
import arrowIcon from '@/assets/figma/profile-arrow.svg'
import dangerIcon from '@/assets/figma/profile-danger.svg'
import downloadIcon from '@/assets/figma/profile-download.svg'
import heartIcon from '@/assets/figma/profile-heart.svg'
import locationIcon from '@/assets/figma/profile-location.svg'
import logoutIcon from '@/assets/figma/profile-logout.svg'
import shoppingIcon from '@/assets/figma/profile-shopping.svg'
import userIcon from '@/assets/figma/profile-user.svg'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'profile', label: 'Dados do perfil', href: '/profile', icon: userIcon, width: 18, height: 18, gap: 'gap-4' },
  { id: 'wallets', label: 'Carteiras', href: '/wallets', icon: locationIcon, width: 13.7497, height: 16.2502, gap: 'gap-3' },
  { id: 'activity', label: 'Atividade', icon: shoppingIcon, width: 18, height: 18, gap: 'gap-3' },
  { id: 'watchlist', label: 'Lista de interesse', icon: heartIcon, width: 16, height: 16, gap: 'gap-3' },
  { id: 'offers', label: 'Ofertas', icon: activityIcon, width: 15.8547, height: 15.9022, gap: 'gap-3' },
  { id: 'downloads', label: 'Arquivos baixados', icon: downloadIcon, width: 15.375, height: 15.4565, gap: 'gap-3' },
  { id: 'support', label: 'Suporte', icon: dangerIcon, width: 15.7499, height: 15, gap: 'gap-3' },
] as const

type SectionId = 'profile' | 'wallets'

export function AccountSidebar({
  active,
  onLogout,
  logoutPending,
}: {
  active: SectionId
  onLogout: () => void
  logoutPending: boolean
}) {
  const isMobile = useIsMobile()
  const current = NAV.find((item) => item.id === active) ?? NAV[0]

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger className="flex h-12 w-full items-center justify-between gap-3 bg-card px-4 text-left">
          <span className="text-lg leading-4 font-bold">Meu perfil</span>
          <span className="flex min-w-0 items-center gap-2 text-[15px] leading-[15px] text-brand">
            <span className="truncate">{current.label}</span>
            <img src={arrowIcon} alt="" width={20} height={20} className="shrink-0" />
          </span>
        </SheetTrigger>
        <SheetContent className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-card px-4 pt-5 pb-2">
            <SheetTitle className="leading-4">Meu perfil</SheetTitle>
            <SheetClose className="rounded-sm text-sm font-bold text-brand">Fechar</SheetClose>
          </div>
          <AccountNav active={active} />
          <div className="hairline-b" />
          <LogoutButton onLogout={onLogout} pending={logoutPending} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className="w-full shrink-0 bg-card py-2 min-[1440px]:w-[310px]">
      <h2 className="px-2.5 py-2.5 text-lg leading-4 font-bold">Meu perfil</h2>
      <AccountNav active={active} />
      <div className="hairline-b" />
      <LogoutButton onLogout={onLogout} pending={logoutPending} />
    </aside>
  )
}

function AccountNav({ active }: { active: SectionId }) {
  return (
    <nav aria-label="Conta">
      <ul>
        {NAV.map((item) => (
          <li key={item.id}>
            {'href' in item ? (
              <Link
                to={item.href}
                aria-current={item.id === active ? 'page' : undefined}
                className={cn(
                  'flex items-center px-4 text-[15px] leading-[45px] text-brand',
                  item.gap,
                  item.id === active && 'border-l-[6px] border-primary',
                )}
              >
                <NavIcon src={item.icon} width={item.width} height={item.height} />
                {item.label}
              </Link>
            ) : (
              <span className={cn('flex items-center px-4 text-[15px] leading-[45px] text-brand', item.gap)}>
                <NavIcon src={item.icon} width={item.width} height={item.height} />
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function LogoutButton({ onLogout, pending }: { onLogout: () => void; pending: boolean }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="flex h-10 w-full items-center gap-2 px-4 text-[15px] leading-[15px] font-bold text-brand disabled:opacity-60"
    >
      <img src={logoutIcon} alt="" width={17.7779} height={16.9167} />
      Sair
    </button>
  )
}

function NavIcon({ src, width, height }: { src: string; width: number; height: number }) {
  return <img src={src} alt="" width={width} height={height} className="shrink-0" />
}
