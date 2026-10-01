import { getErrorMessage } from '@/lib/api/errors'
import { useFavorite } from '@/lib/api/favorites'
import type { Nft } from '@/lib/api/types'
import type { FavoriteControl } from './favorite-heart'

export function useFavoriteToggle(nft: Pick<Nft, 'id' | 'name'>, onFeedback: (message: string) => void): FavoriteControl {
  const favorite = useFavorite(nft.id)

  const onToggle = () => {
    if (favorite.isError) {
      onFeedback('Não foi possível carregar seus favoritos. Tentando novamente…')
      void favorite.refetch()
      return
    }
    if (!favorite.isReady || favorite.isPending) return
    const next = !favorite.isFavorite
    favorite.setFavorite(
      { nftId: nft.id, favorite: next },
      {
        onSuccess: () => onFeedback(next ? `${nft.name} foi adicionado aos favoritos.` : `${nft.name} foi removido dos favoritos.`),
        onError: (error) => onFeedback(`Não foi possível ${next ? 'favoritar' : 'remover dos favoritos'}. ${getErrorMessage(error)}`),
      },
    )
  }

  return {
    active: favorite.isFavorite,
    busy: favorite.isPending || (!favorite.isReady && !favorite.isError),
    onToggle,
  }
}
