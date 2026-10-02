import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SkipLink } from '@/components/layout/skip-link'
import { StatusPage } from '@/components/layout/status-page'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { NftDetailDesktop, NftDetailDesktopSkeleton } from '@/components/nft/nft-detail-desktop'
import { MOBILE_BUY_BAR_HEIGHT, NftDetailMobile, NftDetailMobileSkeleton } from '@/components/nft/nft-detail-mobile'
import { NftInfoTabs } from '@/components/nft/nft-info-tabs'
import { RelatedNfts } from '@/components/nft/related-nfts'
import { useFavoriteToggle } from '@/components/nft/use-favorite-toggle'
import { usePurchase } from '@/components/nft/use-purchase'
import { buttonVariants } from '@/components/ui/button'
import { RetryAlert } from '@/components/ui/inline-alert'
import { useIsMobile } from '@/hooks/use-media-query'
import { ApiError, getErrorMessage } from '@/lib/api/errors'
import { cartQueryOptions } from '@/lib/api/cart'
import { prefetchFavorites } from '@/lib/api/favorites'
import { nftDetailQueryOptions, relatedNftsQueryOptions } from '@/lib/api/nfts'
import type { NftDetail } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const EDITION_ID = /^[\w-]{1,32}$/

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: (search: Record<string, unknown>): { edition?: string } => ({
    edition: typeof search.edition === 'string' && EDITION_ID.test(search.edition) ? search.edition : undefined,
  }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
    void context.queryClient.prefetchQuery(relatedNftsQueryOptions(params.nftId))
    prefetchFavorites(context.queryClient)
    void context.queryClient.prefetchQuery(cartQueryOptions())
  },
  component: NftDetailPage,
})

function NftDetailContent({ nft, isMobile, onBack }: { nft: NftDetail; isMobile: boolean; onBack: () => void }) {
  const { edition } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [feedback, setFeedback] = useState<string>()
  const favoriteControl = useFavoriteToggle(nft, setFeedback)

  const purchase = usePurchase(
    nft,
    edition,
    (id) => {
      setFeedback(undefined)
      void navigate({ search: { edition: id }, replace: true, resetScroll: false })
    },
    (intent) => {
      if (intent === 'add') setFeedback(`${nft.name} foi adicionado ao carrinho.`)
      else void router.navigate({ to: '/cart' })
    },
    setFeedback,
  )

  return isMobile ? (
    <NftDetailMobile nft={nft} purchase={purchase} favorite={favoriteControl} feedback={feedback} onBack={onBack} />
  ) : (
    <NftDetailDesktop
      nft={nft}
      purchase={purchase}
      favorite={favoriteControl}
      feedback={feedback}
      shareUrl={`${window.location.origin}/nfts/${nft.id}`}
    />
  )
}

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const isMobile = useIsMobile()

  const detail = useQuery(nftDetailQueryOptions(nftId))
  const related = useQuery(relatedNftsQueryOptions(nftId))

  if (detail.error instanceof ApiError && detail.error.code === 'NOT_FOUND') {
    return (
      <StatusPage title="NFT não encontrado" description="O NFT que você procura não existe ou não está mais à venda no mercado.">
        <Link to="/" hash="mercado" className={cn(buttonVariants(), 'rounded-md font-bold')}>
          Voltar ao mercado
        </Link>
      </StatusPage>
    )
  }

  const onBack = () => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))
  const nft = detail.data
  const product = nft ? (
    <NftDetailContent key={nft.id} nft={nft} isMobile={isMobile} onBack={onBack} />
  ) : detail.isError ? (
    <RetryAlert message={<>Não foi possível carregar este NFT. {getErrorMessage(detail.error)}</>} onRetry={() => void detail.refetch()} />
  ) : isMobile ? (
    <NftDetailMobileSkeleton onBack={onBack} />
  ) : (
    <NftDetailDesktopSkeleton />
  )

  const secondary = (
    <>
      <NftInfoTabs nft={nft} />
      <RelatedNfts nfts={related.data} isError={related.isError} onRetry={() => void related.refetch()} />
    </>
  )

  const loadingStatus = (
    <p role="status" className="sr-only">
      {detail.isPending ? 'Carregando NFT…' : ''}
    </p>
  )

  if (isMobile) {
    return (
      <div style={{ paddingBottom: nft ? MOBILE_BUY_BAR_HEIGHT : undefined }}>
        <SkipLink />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          {loadingStatus}
          {product}
          <div className="flex flex-col gap-16 bg-card px-6 pt-10 pb-6">{secondary}</div>
        </main>
        <SiteFooter className="mt-16 px-6" />
      </div>
    )
  }

  return (
    <PageShell className="gap-8 px-8 py-6">
      <SiteHeader active="market" bordered={false} />
      <main id="conteudo" tabIndex={-1} className="flex flex-col gap-24 outline-none">
        <div className="flex flex-col gap-3">
          <Breadcrumb />
          {loadingStatus}
          {product}
        </div>
        {secondary}
      </main>
      <SiteFooter className="mt-16" />
    </PageShell>
  )
}
