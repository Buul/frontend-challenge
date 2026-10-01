import { useSearch } from '@tanstack/react-router'
import { NFT_SEARCH_MAX_LENGTH } from '@/lib/api/types'

type NftSearchFieldProps = {
  id: string
  placeholder: string
  className?: string
  autoFocus?: boolean
  enterKeyHint?: 'search'
  onEscape?: () => void
}

/** Labelled `q` field shared by the header and the mobile search bar. */
export function NftSearchField({ id, placeholder, className, autoFocus, enterKeyHint, onEscape }: NftSearchFieldProps) {
  const { q } = useSearch({ strict: false })

  return (
    <>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs por nome
      </label>
      <input
        key={q}
        id={id}
        name="q"
        type="search"
        defaultValue={q}
        maxLength={NFT_SEARCH_MAX_LENGTH}
        autoFocus={autoFocus}
        enterKeyHint={enterKeyHint}
        placeholder={placeholder}
        onKeyDown={onEscape ? (event) => event.key === 'Escape' && onEscape() : undefined}
        className={className}
      />
    </>
  )
}
