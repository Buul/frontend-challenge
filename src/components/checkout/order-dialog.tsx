import closeIcon from '@/assets/figma/auth-close.svg'
import thankYou from '@/assets/figma/thank-you.svg'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Order } from '@/lib/api/types'
import { formatDate, formatDiscount, formatEth, shortenAddress } from '@/lib/format'

export function OrderDialog({ order, onClose }: { order?: Order; onClose: () => void }) {
  return (
    <Dialog open={order !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[680px] gap-0 overflow-hidden rounded-2xl p-0">
        {order && (
          <div className="flex max-h-[calc(100svh-2rem)] flex-col">
            <div className="relative flex flex-col items-center gap-6 overflow-y-auto px-6 py-8 sm:px-10">
              <DialogClose aria-label="Fechar" className="absolute top-4 right-4 grid size-8 place-items-center rounded-sm hover:opacity-80">
                <img src={closeIcon} alt="" width={18} height={18} />
              </DialogClose>
              <img src={thankYou} alt="" width={65.1639} height={80} />
              <DialogTitle className="text-center text-lg leading-6 font-bold">Seus NFTs agora estão na sua carteira</DialogTitle>
              <DialogDescription className="sr-only">Recibo do pedido {order.id}</DialogDescription>
              <dl className="grid w-full grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-tertiary">ID da transação</dt>
                  <dd className="font-bold" title={order.txId}>
                    {shortenAddress(order.txId)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-tertiary">Data</dt>
                  <dd className="font-bold">{formatDate(order.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-tertiary">Total</dt>
                  <dd className="font-bold text-brand">{formatEth(order.total)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-tertiary">Carteira</dt>
                  <dd className="truncate font-bold">{order.walletLabel}</dd>
                </div>
              </dl>
              <section className="flex w-full flex-col gap-3">
                <h2 className="text-[15px] leading-4 font-bold">Detalhes da transação</h2>
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs text-tertiary">
                  <span>NFTs</span>
                  <span>Edições</span>
                  <span className="text-right">Subtotal</span>
                </div>
                <ul className="flex flex-col gap-3">
                  {order.items.map((item) => (
                    <li key={`${item.name}:${item.editionLabel}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <img src={item.image} alt="" width={48} height={48} className="size-12 rounded-md object-cover" />
                        <span className="truncate text-sm font-bold">{item.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {item.editionLabel} (x{item.quantity})
                      </span>
                      <span className="text-right text-sm font-bold text-brand">{formatEth(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between">
                    <dt>Desconto do lançamento</dt>
                    <dd>{formatDiscount(order.discount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Taxa de rede</dt>
                    <dd>{formatEth(order.networkFee)}</dd>
                  </div>
                  <div className="flex justify-between font-bold">
                    <dt>Total</dt>
                    <dd className="text-brand">{formatEth(order.total)}</dd>
                  </div>
                </dl>
              </section>
              <p className="text-center text-sm leading-5 text-muted-foreground">
                Transação confirmada na {order.networkLabel}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
              </p>
              <a
                href={`https://etherscan.io/tx/${order.txId}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-[45px] w-full items-center justify-center rounded-lg bg-primary text-[15px] leading-4 font-bold text-primary-foreground hover:bg-primary/85"
              >
                Ver no Etherscan
              </a>
            </div>
            <div aria-hidden className="h-2.5 shrink-0 bg-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
