import { cn } from '@/lib/utils'

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-4 place-items-center rounded-full text-[10px] leading-none font-medium text-primary-foreground ring-2 ring-background',
        className,
      )}
    >
      {count}
    </span>
  )
}

export const cartLabel = (count: number) => (count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio')
