import type { CheckoutRequest } from '@/lib/api/orders'
import type { NetworkId, User, WalletId } from '@/lib/api/types'

/** Wallets shown on the mobile payment screen. Addresses are display fixtures, not connected accounts. */
export const SAVED_WALLETS = [
  { id: 'reserve', name: 'Reserva', address: 'nova.kurio.eth', network: 'polygon', networkLabel: 'Rede Polygon' },
  {
    id: 'main',
    name: 'Principal',
    address: '0xA91F4c8e2b1d6a7035f0c91b7e4d2a18c6b1E82C',
    network: 'ethereum',
    networkLabel: 'Rede principal Ethereum',
  },
] as const satisfies readonly { id: string; name: string; address: string; network: NetworkId; networkLabel: string }[]

export type SavedWallet = (typeof SAVED_WALLETS)[number]

/**
 * Mobile payment picks a saved wallet instead of the desktop profile form.
 * The referral code is filled in because that screen has nowhere to type one.
 */
export function checkoutFromWallet(user: User, account: SavedWallet, walletType: WalletId): CheckoutRequest {
  const ensName = account.address.includes('.') ? account.address.split('.')[0] : account.name.toLowerCase()
  return {
    displayName: user.name,
    username: user.name.split(' ')[0] || user.name,
    network: account.network,
    profileName: account.name,
    walletAddress: account.address,
    secondaryWallet: '',
    walletType,
    referralCode: 'KURIO',
    email: user.email,
    ensName,
    ensSuffix: 'eth',
    useOtherWallet: false,
    notes: '',
  }
}
