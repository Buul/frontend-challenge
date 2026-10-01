import minusIcon from '@/assets/figma/minus.svg'
import minusSmallIcon from '@/assets/figma/minus-sm.svg'
import plusIcon from '@/assets/figma/plus.svg'
import plusSmallIcon from '@/assets/figma/plus-sm.svg'
import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  value: number
  max: number
  onChange: (value: number) => void
  size?: 'lg' | 'sm'
  disabled?: boolean
}

const SIZES = {
  lg: {
    button: 'h-[49.5px] w-[33px] drop-shadow-[0px_6.6px_9.9px_rgba(20,13,10,0.15)]',
    value: 'min-w-[13px] text-xl leading-7',
    icon: 26.4,
    minus: minusIcon,
    plus: plusIcon,
  },
  sm: {
    button: 'h-[30px] w-5 drop-shadow-[0px_4px_6px_rgba(20,13,10,0.15)]',
    value: 'min-w-[11px] text-lg leading-[25px] font-medium',
    icon: 16,
    minus: minusSmallIcon,
    plus: plusSmallIcon,
  },
}

export function QuantityStepper({ value, max, onChange, size = 'lg', disabled = false }: QuantityStepperProps) {
  const styles = SIZES[size]
  const button = cn(
    'flex items-center justify-center rounded-full border border-background bg-primary transition-colors hover:bg-primary/85',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary',
    styles.button,
  )

  return (
    <div role="group" aria-label="Quantidade" className="flex items-center gap-3">
      <button type="button" aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={button}>
        <img src={styles.minus} alt="" width={styles.icon} height={styles.icon} />
      </button>
      <output aria-live="polite" className={cn('text-center tabular-nums', styles.value)}>
        {value}
      </output>
      <button type="button" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={button}>
        <img src={styles.plus} alt="" width={styles.icon} height={styles.icon} />
      </button>
    </div>
  )
}
