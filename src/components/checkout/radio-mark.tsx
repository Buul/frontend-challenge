import radio from '@/assets/figma/radio.svg'

/** Empty ring from the payment design; the selected state fills the center. */
export function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span className="relative grid size-4 shrink-0 place-items-center">
      <img src={radio} alt="" width={16} height={16} />
      {selected && <span className="absolute size-2.5 rounded-full bg-primary" />}
    </span>
  )
}
