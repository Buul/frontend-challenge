import { useEffect, useState } from 'react'
import { SESSION_EXPIRED_NOTICE } from '@/components/auth/session-sync'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { useFavorite } from '@/lib/api/favorites'
import type { Nft } from '@/lib/api/types'
import { useAuthDialog } from '@/lib/auth/auth-dialog'
import type { FavoriteControl } from './favorite-heart'

export function useFavoriteToggle(nft: Pick<Nft, 'id' | 'name'>, onFeedback: (message: string) => void): FavoriteControl {
  const favorite = useFavorite(nft.id)
  const { open: openLogin } = useAuthDialog()
  // Value requested before signing in; applied once the new session's favorites have loaded.
  const [pending, setPending] = useState<boolean>()

  const apply = (next: boolean) => {
    favorite.setFavorite(
      { nftId: nft.id, favorite: next },
      {
        onSuccess: () => onFeedback(next ? `${nft.name} foi adicionado aos favoritos.` : `${nft.name} foi removido dos favoritos.`),
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
            onFeedback(SESSION_EXPIRED_NOTICE)
            openLogin({ notice: SESSION_EXPIRED_NOTICE, onAuthenticated: () => setPending(next) })
            return
          }
          onFeedback(`Não foi possível ${next ? 'favoritar' : 'remover dos favoritos'}. ${getErrorMessage(error)}`)
        },
      },
    )
  }

  useEffect(() => {
    if (pending === undefined || !favorite.isAuthenticated || !favorite.isReady || favorite.isPending) return
    setPending(undefined)
    if (favorite.isFavorite === pending) {
      onFeedback(pending ? `${nft.name} já está nos seus favoritos.` : `${nft.name} não está nos seus favoritos.`)
      return
    }
    apply(pending)
    // `apply` and `onFeedback` are recreated every render; the effect only needs to react to the session becoming ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, favorite.isAuthenticated, favorite.isReady, favorite.isPending, favorite.isFavorite])

  const onToggle = () => {
    if (favorite.isError) {
      onFeedback('Não foi possível carregar seus favoritos. Tentando novamente…')
      void favorite.refetch()
      return
    }
    if (!favorite.isReady || favorite.isPending) return
    if (!favorite.isAuthenticated) {
      openLogin({ notice: 'Entre para salvar seus favoritos.', onAuthenticated: () => setPending(true) })
      return
    }
    apply(!favorite.isFavorite)
  }

  return {
    active: favorite.isFavorite,
    busy: favorite.isPending || pending !== undefined || (!favorite.isReady && !favorite.isError),
    onToggle,
  }
}
