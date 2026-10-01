import cardHeart from '@/assets/figma/card-heart.svg'
import heartOutline from '@/assets/figma/heart-outline.svg'
import heartSm from '@/assets/figma/heart-sm.svg'
import { cn } from '@/lib/utils'
import { FilledHeart, type FavoriteControl } from './favorite-heart'

type FavoriteButtonProps = {
  control: FavoriteControl
  variant: 'labeled' | 'circle' | 'card'
  label?: string
}

const CIRCLE = 'grid size-[35px] place-items-center rounded-full border border-border bg-surface-raised'

export function FavoriteButton({ control, variant, label = 'Favoritar' }: FavoriteButtonProps) {
  const { active, busy, onToggle } = control
  const icon =
    variant === 'labeled' ? (
      <span className="grid size-5 place-items-center">
        {active ? <FilledHeart width={20} height={17.79} className="bg-primary" /> : <img src={heartOutline} alt="" width={20} height={20} />}
      </span>
    ) : variant === 'circle' ? (
      active ? (
        <FilledHeart width={16} height={14.23} className="bg-brand" />
      ) : (
        <img src={heartSm} alt="" width={16} height={14.23} />
      )
    ) : (
      <>
        <img src={cardHeart} alt="" width={28} height={28} className="absolute inset-0" />
        {active && <FilledHeart width={15} height={13.35} className="relative bg-primary" />}
      </>
    )

  return (
    <button
      type="button"
      aria-label={variant === 'labeled' ? undefined : label}
      aria-pressed={active}
      aria-busy={busy || undefined}
      onClick={onToggle}
      className={cn(
        busy && 'cursor-progress',
        variant === 'labeled' &&
          'flex h-10 w-[130px] items-center justify-center gap-2 rounded-lg border border-primary text-sm leading-5 font-medium text-brand transition-colors hover:bg-primary/10',
        variant === 'labeled' && active && 'bg-primary/15',
        variant === 'circle' && CIRCLE,
        variant === 'circle' && active && 'border-primary',
        variant === 'card' &&
          'absolute top-0 right-[7px] z-10 grid size-7 place-items-center rounded-full transition-transform before:absolute before:-inset-2 before:content-[""] active:scale-90 motion-reduce:transition-none',
      )}
    >
      {icon}
      {variant === 'labeled' && 'Favoritar'}
    </button>
  )
}
