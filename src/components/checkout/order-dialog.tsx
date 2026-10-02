import closeIcon from '@/assets/figma/auth-close.svg'
import thankYou from '@/assets/figma/thank-you.svg'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/use-media-query'
import { EXPLORERS, type Order, type OrderLine } from '@/lib/api/types'
import { formatEth, formatReceiptDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const shortTx = (txId: string) => `${txId.slice(0, 6)}…${txId.slice(-4)}`


type ConfirmedOrder = Order & { txId: string }

const isConfirmed = (order: Order): order is ConfirmedOrder => order.status === 'confirmed' && order.txId !== undefined

const STATUS_ANNOUNCEMENTS: Record<Order['status'], string> = {
  pending: 'Aguardando a confirmação da carteira.',
  confirmed: 'Pagamento confirmado.',
  refused: 'Pagamento recusado.',
}

/** Follows the order from `pending` to its receipt or refusal; the state arrives through `order.updated`. */
export function OrderDialog({ order, onClose }: { order?: Order; onClose: () => void }) {
  const isMobile = useIsMobile()

  return (
    <Dialog open={order !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'gap-0 overflow-hidden p-0',
          isMobile
            ? 'inset-0 h-dvh max-h-none w-full max-w-none translate-0 rounded-none bg-card'
            : 'w-[578px] max-w-[calc(100vw-2rem)] rounded-none bg-card',
        )}
      >
        {order && (
          <p role="status" className="sr-only">
            {order.failureCode === 'disconnected' ? 'Carteira desconectada.' : STATUS_ANNOUNCEMENTS[order.status]}
          </p>
        )}
        {order &&
          (isConfirmed(order) ? (
            isMobile ? (
              <MobileReceipt order={order} />
            ) : (
              <DesktopReceipt order={order} />
            )
          ) : (
            <OrderProgress order={order} onClose={onClose} />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function DesktopReceipt({ order }: { order: ConfirmedOrder }) {
  return (
    <div className="relative flex max-h-[calc(100svh-2rem)] flex-col">
      <CloseButton />
      <div className="overflow-y-auto">
        <ReceiptHeader />
        <DialogDescription className="sr-only">Recibo do pedido {order.id}</DialogDescription>
        <div className="h-px bg-primary" />
        <dl className="flex h-[65px] items-center justify-between px-9 py-1">
          <Meta term="ID da transação" value={shortTx(order.txId)} title={order.txId} bold />
          <Divider />
          <Meta term="Data" value={formatReceiptDate(order.createdAt)} />
          <Divider />
          <Meta term="Total" value={formatEth(order.total)} />
          <Divider />
          <Meta term="Carteira" value={order.walletName} bold />
        </dl>
        <div className="h-px bg-primary" />
        <div className="flex flex-col gap-3 px-11 pt-5 pb-12">
          <h2 className="text-[15px] leading-4 font-bold">Detalhes da transação</h2>
          <div className="flex items-center justify-between text-base leading-4">
            <span className="font-bold">NFTs</span>
            <div className="flex w-[194px] shrink-0 items-center justify-between">
              <span className="font-bold">Edições</span>
              <span className="font-medium">Subtotal</span>
            </div>
          </div>
          <div className="h-px bg-primary" />
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => (
              <DesktopLine key={`${item.tokenId}:${item.name}`} item={item} />
            ))}
          </ul>
          <Totals order={order} className="ml-auto w-[321px]" />
          <div className="h-px bg-primary" />
          <Note order={order} />
        </div>
      </div>
      <AccentBar />
    </div>
  )
}

function MobileReceipt({ order }: { order: ConfirmedOrder }) {
  return (
    <div className="relative flex h-full flex-col">
      <CloseButton />
      <div className="flex-1 overflow-y-auto px-7 pt-8 pb-8">
        <ReceiptHeader />
        <DialogDescription className="sr-only">Recibo do pedido {order.id}</DialogDescription>
        <div className="mt-6 h-px bg-primary" />
        <div className="flex py-4">
          <Meta term="ID da transação" value={shortTx(order.txId)} title={order.txId} bold className="min-w-0 flex-1" />
          <Divider />
          <Meta term="Data" value={formatReceiptDate(order.createdAt)} className="min-w-0 flex-1 pl-4" />
        </div>
        <div className="h-px bg-primary" />
        <div className="flex py-4">
          <Meta term="Total" value={formatEth(order.total)} className="min-w-0 flex-1" />
          <Divider />
          <Meta term="Carteira" value={order.walletName} bold className="min-w-0 flex-1 pl-4" />
        </div>
        <div className="h-px bg-primary" />
        <h2 className="mt-5 text-[15px] leading-4 font-bold">Detalhes da transação</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {order.items.map((item) => (
            <MobileLine key={`${item.tokenId}:${item.name}`} item={item} />
          ))}
        </ul>
        <Totals order={order} className="mt-6" />
        <div className="mt-4 h-px bg-primary" />
        <Note order={order} buttonClassName="flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(108.86deg,var(--primary)_3.96%,color-mix(in_srgb,var(--primary)_80%,transparent)_121.97%)]" />
      </div>
      <AccentBar />
    </div>
  )
}

/** Pending and refused orders: no receipt yet (or ever), just where the payment stands. */
function OrderProgress({ order, onClose }: { order: Order; onClose: () => void }) {
  const pending = order.status === 'pending'

  return (
    <div className="relative flex h-full flex-col justify-center sm:h-auto">
      <CloseButton />
      <div className="flex flex-col items-center gap-5 px-9 pt-12 pb-10 text-center">
        {pending ? (
          <span aria-hidden className="size-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary motion-reduce:animate-none" />
        ) : (
          <span aria-hidden className="grid size-12 place-items-center rounded-full border-2 border-destructive text-2xl leading-none font-bold text-destructive">
            !
          </span>
        )}
        <DialogTitle className="text-lg leading-6 font-bold">
          {pending ? 'Confirmando o pagamento' : order.failureCode === 'disconnected' ? 'Carteira desconectada' : 'Pagamento recusado'}
        </DialogTitle>
        <DialogDescription className="max-w-[380px] text-sm leading-[22px] text-muted-foreground">
          {pending
            ? `Confirme a transação de ${formatEth(order.total)} na ${order.walletName}. O recibo aparece aqui assim que a ${order.networkLabel} responder.`
            : order.failureReason}
        </DialogDescription>
        <p className="text-xs leading-4 text-tertiary">Pedido {order.id}</p>
        {!pending && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-[5px] bg-primary px-6 py-4 text-base leading-4 font-bold text-primary-foreground hover:opacity-90"
          >
            Revisar e tentar de novo
          </button>
        )}
      </div>
      <AccentBar />
    </div>
  )
}

function ReceiptHeader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <img src={thankYou} alt="" width={65.1639} height={80} />
      <DialogTitle className="text-center text-base leading-4 font-bold text-muted-foreground">Seus NFTs agora estão na sua carteira</DialogTitle>
    </div>
  )
}

function CloseButton() {
  return (
    <DialogClose aria-label="Fechar" className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-sm hover:opacity-80">
      <img src={closeIcon} alt="" width={18} height={18} />
    </DialogClose>
  )
}

function Divider() {
  return <span aria-hidden className="h-[31px] w-px shrink-0 bg-primary" />
}

function AccentBar() {
  return <div aria-hidden className="h-2.5 shrink-0 bg-primary" />
}

function Meta({ term, value, title, bold, className }: { term: string; value: string; title?: string; bold?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col text-muted-foreground', className)}>
      <dt className={cn('text-sm leading-4', bold && 'font-bold')}>{term}</dt>
      <dd className="truncate text-[15px] leading-5" title={title}>
        {value}
      </dd>
    </div>
  )
}

function DesktopLine({ item }: { item: OrderLine }) {
  return (
    <li className="flex h-[70px] items-center justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <img src={item.image} alt="" width={70} height={70} className="size-[70px] shrink-0 rounded-lg object-cover" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-base leading-4 font-bold">{item.name}</p>
          <p className="truncate text-sm leading-4 text-tertiary">ID do token: {item.tokenId}</p>
        </div>
      </div>
      <div className="flex w-[194px] shrink-0 items-center justify-between text-right leading-4">
        <span className="text-sm text-muted-foreground">(x {item.quantity})</span>
        <span className="text-lg font-bold text-brand">{formatEth(item.lineTotal)}</span>
      </div>
    </li>
  )
}

function MobileLine({ item }: { item: OrderLine }) {
  return (
    <li className="flex gap-3">
      <img src={item.image} alt="" width={70} height={70} className="size-[70px] shrink-0 rounded-lg object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-base leading-4 font-bold">{item.name}</p>
        <p className="truncate text-sm leading-4 text-tertiary">ID do token: {item.tokenId}</p>
        <div className="flex items-center justify-between leading-4">
          <span className="text-sm text-muted-foreground">(x {item.quantity})</span>
          <span className="text-lg font-bold text-brand">{formatEth(item.lineTotal)}</span>
        </div>
      </div>
    </li>
  )
}

function Totals({ order, className }: { order: Order; className?: string }) {
  return (
    <dl className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <dt className="text-[15px] leading-5">Taxa de rede</dt>
        <dd className="text-lg leading-4">{formatEth(order.networkFee)}</dd>
      </div>
      <div className="flex items-center justify-between font-bold leading-4">
        <dt className="text-base">Total</dt>
        <dd className="text-lg text-brand">{formatEth(order.total)}</dd>
      </div>
    </dl>
  )
}

function Note({ order, buttonClassName }: { order: ConfirmedOrder; buttonClassName?: string }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-3">
      <p className="text-center text-sm leading-[22px] text-muted-foreground">
        Transação confirmada na {order.networkLabel}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
      </p>
      <a
        href={EXPLORERS[order.network].txUrl(order.txId)}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'bg-primary px-4 py-4 text-base leading-4 font-bold text-primary-foreground hover:opacity-90',
          buttonClassName ?? 'rounded-[5px]',
        )}
      >
        Ver no {EXPLORERS[order.network].name}
      </a>
    </div>
  )
}
