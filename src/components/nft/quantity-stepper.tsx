import minusIcon from '@/assets/figma/minus.svg'
import minusSmallIcon from '@/assets/figma/minus-sm.svg'
import plusIcon from '@/assets/figma/plus.svg'
import plusSmallIcon from '@/assets/figma/plus-sm.svg'
import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  value: number
  max: number
  onChange: (value: number) => void
  size?: 'lg' | 'sm' | 'cart'
  disabled?: boolean
}

const SIZES = {
  lg: {
    minus: 'h-[49.5px] w-[33px] border-background bg-primary drop-shadow-[0px_6.6px_9.9px_rgba(20,13,10,0.15)] hover:bg-primary/85 disabled:hover:bg-primary',
    plus: 'h-[49.5px] w-[33px] border-background bg-primary drop-shadow-[0px_6.6px_9.9px_rgba(20,13,10,0.15)] hover:bg-primary/85 disabled:hover:bg-primary',
    value: 'min-w-[13px] text-xl leading-7',
    icon: 26.4,
    minusSrc: minusIcon,
    plusSrc: plusIcon,
  },
  sm: {
    minus: 'h-[30px] w-5 border-background bg-primary drop-shadow-[0px_4px_6px_rgba(20,13,10,0.15)] hover:bg-primary/85 disabled:hover:bg-primary',
    plus: 'h-[30px] w-5 border-background bg-primary drop-shadow-[0px_4px_6px_rgba(20,13,10,0.15)] hover:bg-primary/85 disabled:hover:bg-primary',
    value: 'min-w-[11px] text-lg leading-[25px] font-medium',
    icon: 16,
    minusSrc: minusSmallIcon,
    plusSrc: plusSmallIcon,
  },
  cart: {
    minus: 'size-6 border-background bg-primary hover:bg-primary/85 disabled:hover:bg-primary',
    plus: 'size-6 border-border bg-surface-raised hover:bg-surface-raised/80 disabled:hover:bg-surface-raised',
    value: 'min-w-4 text-base leading-[22px]',
    icon: 16,
    minusSrc: minusSmallIcon,
    plusSrc: plusSmallIcon,
  },
}

export function QuantityStepper({ value, max, onChange, size = 'lg', disabled = false }: QuantityStepperProps) {
  const styles = SIZES[size]
  const button = (extra: string) =>
    cn(
      'flex items-center justify-center rounded-full border transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-40',
      extra,
    )

  return (
    <div role="group" aria-label="Quantidade" className={cn('flex items-center', size === 'cart' ? 'gap-3.5' : 'gap-3')}>
      <button type="button" aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={button(styles.minus)}>
        <img src={styles.minusSrc} alt="" width={styles.icon} height={styles.icon} />
      </button>
      <output aria-live="polite" className={cn('text-center tabular-nums', styles.value)}>
        {value}
      </output>
      <button type="button" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={button(styles.plus)}>
        <img src={styles.plusSrc} alt="" width={styles.icon} height={styles.icon} className={size === 'cart' ? 'brightness-0 invert' : undefined} />
      </button>
    </div>
  )
}
