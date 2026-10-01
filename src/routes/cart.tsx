import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { CartDesktop } from '@/components/cart/cart-desktop'
import { CartMobile } from '@/components/cart/cart-mobile'
import { CHECKOUT_UNAVAILABLE } from '@/components/cart/cart-summary'
import { PageShell } from '@/components/layout/page-shell'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { RelatedNfts } from '@/components/nft/related-nfts'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-media-query'
import { useSession } from '@/lib/api/auth'
import { cartQueryOptions, useApplyPromo, useUpdateCartItem } from '@/lib/api/cart'
import { getErrorMessage } from '@/lib/api/errors'
import { suggestedNftsQueryOptions } from '@/lib/api/nfts'
import type { CartItem } from '@/lib/api/types'
import { useAuthDialog } from '@/lib/auth/auth-dialog'

export const Route = createFileRoute('/cart')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
    void context.queryClient.prefetchQuery(suggestedNftsQueryOptions())
  },
  component: CartPage,
})

function CartPage() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const cart = useQuery(cartQueryOptions())
  const suggested = useQuery(suggestedNftsQueryOptions())
  const updateItem = useUpdateCartItem()
  const applyPromo = useApplyPromo()
  const { user } = useSession()
  const { open: openLogin } = useAuthDialog()
  const [notice, setNotice] = useState<string>()

  const pending = updateItem.isPending || applyPromo.isPending
  const onBack = () => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))

  const setQuantity = (item: CartItem, quantity: number) => {
    setNotice(undefined)
    updateItem.mutate(
      { nftId: item.nftId, editionId: item.editionId, quantity },
      { onError: (error) => setNotice(getErrorMessage(error)) },
    )
  }

  const onRemove = (item: CartItem) => setQuantity(item, 0)

  const onApplyPromo = (code: string) => {
    setNotice(undefined)
    applyPromo.mutate(code, { onError: (error) => setNotice(getErrorMessage(error)) })
  }

  const onCheckout = () => {
    if (!user) {
      openLogin({
        notice: 'Entre para finalizar a compra.',
        onAuthenticated: () => setNotice(CHECKOUT_UNAVAILABLE),
      })
      return
    }
    setNotice(CHECKOUT_UNAVAILABLE)
  }

  const body = cart.data ? (
    isMobile ? (
      <CartMobile
        cart={cart.data}
        pending={pending}
        notice={notice}
        onBack={onBack}
        onQuantity={setQuantity}
        onRemove={onRemove}
        onApplyPromo={onApplyPromo}
        onCheckout={onCheckout}
      />
    ) : (
      <CartDesktop
        cart={cart.data}
        pending={pending}
        notice={notice}
        onQuantity={setQuantity}
        onRemove={onRemove}
        onApplyPromo={onApplyPromo}
        onCheckout={onCheckout}
      />
    )
  ) : cart.isError ? (
    <RetryAlert message={<>Não foi possível carregar o carrinho. {getErrorMessage(cart.error)}</>} onRetry={() => void cart.refetch()} />
  ) : isMobile ? (
    <CartMobileSkeleton onBack={onBack} />
  ) : (
    <CartDesktopSkeleton />
  )

  if (isMobile) {
    return (
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {body}
      </main>
    )
  }

  return (
    <PageShell className="gap-8 px-8 py-6">
      <SiteHeader active="market" bordered={false} />
      <main id="conteudo" tabIndex={-1} className="flex flex-col gap-24 outline-none">
        {body}
        <RelatedNfts
          title="Colecionadores também viram"
          nfts={suggested.data}
          isError={suggested.isError}
          onRetry={() => void suggested.refetch()}
        />
      </main>
      <SiteFooter className="mt-16" />
    </PageShell>
  )
}

function CartDesktopSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-4 w-56" />
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex flex-1 flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[70px] w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full lg:w-[332px]" />
      </div>
    </div>
  )
}

function CartMobileSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div aria-hidden className="flex flex-col gap-3 px-7 pt-8">
      <div className="flex h-11 items-center">
        <button type="button" aria-label="Voltar" onClick={onBack} className="size-[35px] rounded-full bg-surface-raised" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[100px] w-full rounded-[14px]" />
      ))}
    </div>
  )
}
