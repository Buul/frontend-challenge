import { Link } from '@tanstack/react-router'
import scan1 from '@/assets/figma/scan-1.svg'
import scan2 from '@/assets/figma/scan-2.svg'
import scan3 from '@/assets/figma/scan-3.svg'
import scan4 from '@/assets/figma/scan-4.svg'
import scan5 from '@/assets/figma/scan-5.svg'
import tabBarBg from '@/assets/figma/tab-bar-bg.svg'
import tabBarFab from '@/assets/figma/tab-bar-fab.svg'
import cartIcon from '@/assets/figma/tab-cart.svg'
import heartIcon from '@/assets/figma/tab-heart.svg'
import homeIcon from '@/assets/figma/tab-home.svg'
import userIcon from '@/assets/figma/tab-user.svg'

/** Height reserved at the bottom of mobile pages so content can scroll clear of the bar. */
export const MOBILE_TAB_BAR_HEIGHT = 126

// Icon centres follow the 414px-wide design; horizontal offsets are percentages so the bar scales down on narrower phones.
const item = 'absolute top-[81px] grid size-11 -translate-1/2 place-items-center rounded-full'

function ScanIcon() {
  return (
    <span aria-hidden className="relative block h-6 w-[26.82px]">
      <img src={scan5} alt="" width={10.39} height={10.31} className="absolute top-0 left-[1.33px]" />
      <img src={scan3} alt="" width={10.39} height={10.3} className="absolute top-[0.08px] left-[15.1px]" />
      <img src={scan1} alt="" width={26.82} height={1.79} className="absolute top-[11.1px] left-0" />
      <img src={scan2} alt="" width={10.35} height={10.31} className="absolute top-[13.69px] left-[1.33px]" />
      <img src={scan4} alt="" width={10.32} height={10.25} className="absolute top-[13.7px] left-[15.1px]" />
    </span>
  )
}

export function MobileTabBar({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <nav aria-label="Navegação inferior" className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="relative mx-auto max-w-[414px]" style={{ height: MOBILE_TAB_BAR_HEIGHT }}>
        <div aria-hidden className="pointer-events-auto absolute inset-[24.6%_0_0.04%_0]">
          <div className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%]">
            <img src={tabBarBg} alt="" width={474} height={155} className="block size-full max-w-none" />
          </div>
        </div>

        <div className="pointer-events-auto">
          <Link to="/" aria-label="Início" activeOptions={{ exact: true, includeSearch: false }} className={`${item} left-[calc(8.7%+10px)]`}>
            <img src={homeIcon} alt="" width={15.83} height={16.67} />
          </Link>
          <button type="button" aria-label="Favoritos" className={`${item} left-[calc(26.09%+10px)]`}>
            <img src={heartIcon} alt="" width={20} height={17.79} />
          </button>
          <button
            type="button"
            aria-label="Escanear NFT"
            className="absolute top-0 left-1/2 grid size-[65px] -translate-x-1/2 place-items-center rounded-full transition-transform active:scale-95"
          >
            <img src={tabBarFab} alt="" width={65} height={65} className="absolute inset-0" />
            <span className="relative">
              <ScanIcon />
            </span>
          </button>
          <button
            type="button"
            aria-label={cartCount > 0 ? `Carrinho, ${cartCount} itens` : 'Carrinho vazio'}
            className={`${item} left-[calc(70.53%+10px)]`}
          >
            <img src={cartIcon} alt="" width={20} height={20} />
          </button>
          <button type="button" aria-label="Entrar" className={`${item} left-[calc(85.51%+10px)]`}>
            <img src={userIcon} alt="" width={20} height={20} />
          </button>
        </div>
      </div>
    </nav>
  )
}
