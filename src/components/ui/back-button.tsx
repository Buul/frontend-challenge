import arrowBack from '@/assets/figma/arrow-back.svg'

/** The round "back" button that opens the mobile screens (detail, cart, payment). */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={onClick}
      className="grid size-[35px] shrink-0 place-items-center rounded-full border border-border bg-surface-raised"
    >
      <span className="grid size-5 place-items-center">
        <img src={arrowBack} alt="" width={13.17} height={7.33} className="rotate-90" />
      </span>
    </button>
  )
}
