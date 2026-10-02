import type { CollectorWallet, CollectorWallets } from '@/lib/api/types'
import { ENS_SUFFIXES, NETWORKS, WALLETS } from '@/lib/api/types'
import { walletSchema } from '@/lib/validation'
import { isRecord, persisted } from './storage'

const WALLETS_STORAGE_KEY = 'kurio:mock:wallets'

const emptyBook = (): CollectorWallets => ({ primary: null, secondary: null, mirrorPrimary: false })

const books = persisted<Record<string, CollectorWallets>>(WALLETS_STORAGE_KEY, () => ({}), isRecord)

export function readWallets(userId: string): CollectorWallets {
  return books.read()[userId] ?? emptyBook()
}

/** Turns a validated wallet body into the stored shape. Returns undefined when an id is not one of the known lists. */
export function toCollectorWallet(input: unknown): CollectorWallet | undefined {
  const parsed = walletSchema.safeParse(input)
  if (!parsed.success) return undefined
  const network = NETWORKS.find((item) => item.id === parsed.data.network)?.id
  const walletType = WALLETS.find((item) => item.id === parsed.data.walletType)?.id
  const ensSuffix = ENS_SUFFIXES.find((item) => item.id === parsed.data.ensSuffix)?.id
  if (!network || !walletType || !ensSuffix) return undefined
  return { ...parsed.data, network, walletType, ensSuffix }
}

function write(userId: string, book: CollectorWallets) {
  books.write({ ...books.read(), [userId]: book })
}

export function saveWallet(userId: string, slot: 'primary' | 'secondary', wallet: CollectorWallet): CollectorWallets {
  const current = readWallets(userId)
  const next: CollectorWallets = {
    ...current,
    [slot]: wallet,
    mirrorPrimary: slot === 'secondary' ? false : current.mirrorPrimary,
  }
  write(userId, next)
  return next
}

export function setWalletMirror(userId: string, mirrorPrimary: boolean): CollectorWallets | 'missing-primary' {
  const current = readWallets(userId)
  if (mirrorPrimary && !current.primary) return 'missing-primary'
  const next: CollectorWallets = {
    ...current,
    mirrorPrimary,
    secondary: mirrorPrimary ? null : current.secondary,
  }
  write(userId, next)
  return next
}
