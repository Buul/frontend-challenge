import starFilled from '@/assets/figma/star-filled.svg'
import starMuted from '@/assets/figma/star-muted.svg'
import { formatRating } from '@/lib/format'

export function RatingStars({ rating }: { rating: number }) {
  const filled = Math.floor(rating)

  return (
    <span role="img" aria-label={`Avaliação ${formatRating(rating)} de 5`} className="flex shrink-0 gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="grid size-[15px] place-items-center">
          <img src={i < filled ? starFilled : starMuted} alt="" width={12.5} height={11.88} />
        </span>
      ))}
    </span>
  )
}
