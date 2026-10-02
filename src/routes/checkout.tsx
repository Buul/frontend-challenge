import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { CheckoutDesktop, type CheckoutDraft } from '@/components/checkout/checkout-desktop'
import { CheckoutMobile } from '@/components/checkout/checkout-mobile'
import { OrderDialog } from '@/components/checkout/order-dialog'
import { checkoutFromWallet, type SavedWallet } from '@/components/checkout/wallets'
import { PageShell } from '@/components/layout/page-shell'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SkipLink } from '@/components/layout/skip-link'
import { BackButton } from '@/components/ui/back-button'
import { RetryAlert } from '@/components/ui/inline-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-media-query'
import { sessionKeys, useSession } from '@/lib/api/auth'
import { cartKeys, cartQueryOptions, fetchCartQuote } from '@/lib/api/cart'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { createAttemptKeys, orderQueryOptions, usePlaceOrder, type CheckoutRequest } from '@/lib/api/orders'
import type { SessionInfo, WalletId } from '@/lib/api/types'
import { compareEth } from '@/lib/eth'
import { formatEth } from '@/lib/format'
import { useAuthDialog } from '@/lib/auth/auth-dialog'
import { sessionToken } from '@/lib/auth/session-token'

const QUOTE_CHANGED = 'Os preços ou a disponibilidade mudaram. Revise o novo total antes de confirmar.'

// Order ids look like `KR-1A2B3C4D`; anything else is ignored.
const ORDER_ID = /^KR-[A-Z0-9]{8}$/

export const Route = createFileRoute('/checkout')({
  // The order in progress lives in the URL, so a refresh or a reconnection picks it up again.
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === 'string' && ORDER_ID.test(search.order) ? search.order : undefined,
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
  },
  component: CheckoutPage,
})

function CheckoutPage() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = Route.useNavigate()
  const { order: orderId } = Route.useSearch()
  const queryClient = useQueryClient()
  const cart = useQuery(cartQueryOptions())
  const { user } = useSession()
  const placeOrder = usePlaceOrder()
  const order = useQuery({ ...orderQueryOptions(user?.id ?? '', orderId ?? ''), enabled: Boolean(user && orderId) })
  const { open: openLogin } = useAuthDialog()
  const [notice, setNotice] = useState<string>()
  const [attemptKeys] = useState(createAttemptKeys)
  const submitting = useRef(false)
  // The payment form can unmount mid-way (an expired session shows the visitor's empty cart): keep what was typed,
  // which also pre-fills a next purchase in the same visit.
  const [draft, setDraft] = useState<CheckoutDraft>()
  const confirmed = order.data?.status === 'confirmed'

  const onBack = () => (canGoBack ? router.history.back() : void router.navigate({ to: '/cart' }))
  const closeOrder = () => void navigate({ search: (prev) => ({ ...prev, order: undefined }), replace: true })

  // An order id that no longer exists, or belongs to another account, is dropped from the URL.
  useEffect(() => {
    if (!(order.error instanceof ApiError)) return
    if (order.error.code === 'NOT_FOUND' || order.error.code === 'FORBIDDEN') {
      setNotice(order.error.code === 'FORBIDDEN' ? 'Este pedido pertence a outra conta.' : 'Pedido não encontrado.')
      closeOrder()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a new error only
  }, [order.error])

  // Prices and supply can change under the collector (via `nft.updated`): say so before they confirm.
  const shownTotal = useRef<string | undefined>(undefined)
  const total = cart.data?.total
  useEffect(() => {
    if (total === undefined) return
    const previous = shownTotal.current
    shownTotal.current = total
    if (previous === undefined || placeOrder.isPending || orderId || cart.data?.itemCount === 0) return
    if (compareEth(previous, total) !== 0) setNotice(`Os preços foram atualizados. O novo total é ${formatEth(total)}; revise antes de confirmar.`)
  }, [total, placeOrder.isPending, orderId, cart.data?.itemCount])

  const place = async (input: CheckoutRequest) => {
    setNotice(undefined)
    if (!sessionToken.get()) {
      openLogin({
        notice: 'Entre para finalizar a compra.',
        onAuthenticated: () => {
          void place(input).catch((error: unknown) => setNotice(getErrorMessage(error)))
        },
      })
      return
    }
    // A confirmation already on its way (revalidating or sending) covers this click too.
    if (submitting.current) return
    submitting.current = true
    try {
      const expectedTotal = queryClient.getQueryData<{ total: string }>(cartKeys.current)?.total ?? '0'
      // Revalidates price, supply, coupon and fee with the server before sending anything.
      const quote = await fetchCartQuote()
      if (compareEth(quote.total, expectedTotal) !== 0) {
        await showFreshCart()
        setNotice(QUOTE_CHANGED)
        return
      }
      const request = { ...input, expectedTotal }
      const placed = await placeOrder.mutateAsync({ input: request, idempotencyKey: attemptKeys.keyFor(request) })
      attemptKeys.reset()
      void navigate({ search: (prev) => ({ ...prev, order: placed.id }), replace: true })
    } catch (error) {
      // The quote moved between the check and the order: the server refused it (409) the same way.
      if (error instanceof ApiError && error.code === 'CONFLICT') await showFreshCart()
      throw error
    } finally {
      submitting.current = false
    }
  }

  // Shows the server's current cart and records its total as seen, so the realtime notice doesn't repeat the message.
  const showFreshCart = async () => {
    await queryClient.invalidateQueries({ queryKey: cartKeys.current })
    shownTotal.current = queryClient.getQueryData<{ total: string }>(cartKeys.current)?.total
  }

  const onSubmit = async (input: CheckoutRequest) => {
    try {
      await place(input)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') throw error
      setNotice(getErrorMessage(error))
    }
  }

  const onConfirmWallet = (account: SavedWallet, walletType: WalletId) => {
    const current = queryClient.getQueryData<SessionInfo | null>(sessionKeys.current)?.user
    if (!current || !sessionToken.get()) {
      openLogin({
        notice: 'Entre para finalizar a compra.',
        onAuthenticated: () => onConfirmWallet(account, walletType),
      })
      return
    }
    void place(checkoutFromWallet(current, account, walletType)).catch((error: unknown) => setNotice(getErrorMessage(error)))
  }

  const empty = (
    <div className="flex flex-col items-start gap-4 py-8">
      {notice && (
        <p role="alert" className="text-[13px] leading-4 text-coral">
          {notice}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {confirmed ? 'Pedido confirmado. Seu carrinho está vazio.' : 'Seu carrinho está vazio. Explore o mercado para adicionar NFTs.'}
      </p>
      <Link to="/" hash="mercado" className="text-[15px] text-brand hover:underline">
        Continuar explorando
      </Link>
    </div>
  )

  const body = !cart.data ? (
    cart.isError ? (
      <RetryAlert message={<>Não foi possível carregar o pagamento. {getErrorMessage(cart.error)}</>} onRetry={() => void cart.refetch()} />
    ) : isMobile ? (
      <CheckoutMobileSkeleton onBack={onBack} />
    ) : (
      <CheckoutDesktopSkeleton />
    )
  ) : cart.data.itemCount === 0 ? (
    empty
  ) : isMobile ? (
    <CheckoutMobile cart={cart.data} pending={placeOrder.isPending || order.data?.status === 'pending'} notice={notice} onBack={onBack} onConfirm={onConfirmWallet} />
  ) : (
    <CheckoutDesktop user={user} draft={draft} onDraft={setDraft} cart={cart.data} pending={placeOrder.isPending || order.data?.status === 'pending'} notice={notice} onSubmit={onSubmit} />
  )

  const dialog = <OrderDialog order={orderId ? order.data : undefined} onClose={closeOrder} />

  if (isMobile) {
    return (
      <>
        <SkipLink />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          {cart.data?.itemCount === 0 && (
            <div className="px-7 pt-8">
              <h1 className="text-xl leading-4 font-bold">Pagamento com carteira</h1>
            </div>
          )}
          {body}
          {dialog}
        </main>
      </>
    )
  }

  return (
    <PageShell className="gap-8 px-8 py-6">
      <SiteHeader active="market" bordered={false} />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {body}
      </main>
      <SiteFooter className="mt-16" />
      {dialog}
    </PageShell>
  )
}

function CheckoutDesktopSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-4 w-56" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full lg:w-[405px]" />
      </div>
    </div>
  )
}

function CheckoutMobileSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3 px-7 pt-8">
      {/* Going back works while the payment loads; only the placeholders are hidden from assistive tech. */}
      <div className="flex h-11 items-center">
        <BackButton onClick={onBack} />
      </div>
      <Skeleton className="h-[93px] w-full rounded-[14px]" />
      <Skeleton className="h-[93px] w-full rounded-[14px]" />
    </div>
  )
}
