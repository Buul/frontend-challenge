import type { EthAmount } from '@/lib/eth'

export const COLLECTIONS = [
  { id: 'digital-art', label: 'Arte digital' },
  { id: 'photography', label: 'Fotografia' },
  { id: 'music', label: 'Música' },
  { id: '3d-art', label: 'Arte 3D' },
  { id: 'collectibles', label: 'Colecionáveis' },
  { id: 'generative', label: 'Generativa' },
  { id: 'games', label: 'Jogos' },
  { id: 'signatures', label: 'Assinaturas' },
  { id: 'utility', label: 'Utilidade' },
] as const

export const NETWORKS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
] as const

/** Block explorer of each network, used to link a confirmed transaction. */
export const EXPLORERS = {
  ethereum: { name: 'Etherscan', txUrl: (txId: string) => `https://etherscan.io/tx/${txId}` },
  polygon: { name: 'Polygonscan', txUrl: (txId: string) => `https://polygonscan.com/tx/${txId}` },
  solana: { name: 'Solscan', txUrl: (txId: string) => `https://solscan.io/tx/${txId}` },
} as const satisfies Record<(typeof NETWORKS)[number]['id'], { name: string; txUrl: (txId: string) => string }>

export const NFT_TABS = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
] as const

export const NFT_SORTS = [
  { id: 'recent', label: 'Listados recentemente' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
] as const

export const NFT_SEARCH_MAX_LENGTH = 100

export const WALLETS = [
  { id: 'walletconnect', label: 'WalletConnect' },
  { id: 'metamask', label: 'MetaMask' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
] as const

export const ENS_SUFFIXES = [
  { id: 'eth', label: '.eth' },
  { id: 'sol', label: '.sol' },
] as const

export type CollectionId = (typeof COLLECTIONS)[number]['id']
export type NetworkId = (typeof NETWORKS)[number]['id']
export type WalletId = (typeof WALLETS)[number]['id']
export type EnsSuffix = (typeof ENS_SUFFIXES)[number]['id']
export type NftTab = (typeof NFT_TABS)[number]['id']
export type NftSort = (typeof NFT_SORTS)[number]['id']

export type NftEdition = {
  id: string
  label: string
  /** `null` for open editions, which have no fixed supply. */
  supply: number | null
  available: number
  maxPerOrder: number
}

export type Nft = {
  id: string
  /** Monotonic per NFT; realtime events carrying an older version must be ignored. */
  version: number
  updatedAt: string
  name: string
  image: string
  price: EthAmount
  previousPrice?: EthAmount
  collection: CollectionId
  network: NetworkId
  listedAt: string
  isNew: boolean
  isTrending: boolean
  isRare: boolean
  editions: NftEdition[]
}

export type NftQuery = {
  q?: string
  tab: NftTab
  sort: NftSort
  page: number
  collection?: CollectionId
  network?: NetworkId
  minPrice?: EthAmount
  maxPrice?: EthAmount
}

export type NftPage = {
  data: Nft[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type NftImage = {
  src: string
  alt: string
}

export type NftReview = {
  id: string
  author: string
  /** 1 to 5. */
  rating: number
  comment: string
  createdAt: string
}

export type NftDetail = Nft & {
  summary: string
  description: string[]
  tokenId: string
  collectionName: string
  creator: string
  attributes: string[]
  images: NftImage[]
  /** Average from 0 to 5, one decimal place. */
  rating: number
  reviewCount: number
  /** Most recent reviews only; `reviewCount` is the total. */
  reviews: NftReview[]
  provenance: string
  contract: { address: string; standard: string }
  royaltyPercent: number
}

export type RelatedNftList = {
  data: Nft[]
}

/** Ids of the NFTs favorited by the authenticated user. */
export type FavoriteList = {
  data: string[]
}

export type CartItemInput = {
  nftId: string
  editionId: string
  quantity: number
}

export type CartItem = CartItemInput & {
  name: string
  image: string
  tokenId: string
  editionLabel: string
  unitPrice: EthAmount
  lineTotal: EthAmount
  available: number
  maxPerOrder: number
}

export type Cart = {
  items: CartItem[]
  itemCount: number
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  promoCode?: string
}

export type OrderLine = {
  name: string
  image: string
  tokenId: string
  editionLabel: string
  quantity: number
  lineTotal: EthAmount
}

/**
 * `pending` while the wallet signs and the network settles the transaction; then `confirmed` (with `txId`)
 * or `refused` (with `failureReason`, and the items back in the cart). Settled orders never change again.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'refused'

/** Receipt snapshot taken by `POST /orders` from the cart; `status` moves on through `order.updated` events. */
export type Order = {
  id: string
  status: OrderStatus
  /** Monotonic; realtime events carrying an older version must be ignored. */
  version: number
  txId?: string
  /** Why a `refused` order failed: the wallet rejected it, or it disconnected before signing. */
  failureCode?: 'rejected' | 'disconnected'
  failureReason?: string
  createdAt: string
  updatedAt: string
  walletLabel: string
  walletName: string
  network: NetworkId
  networkLabel: string
  items: OrderLine[]
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
}

export type User = {
  id: string
  name: string
  email: string
}

/** Collector profile edited on `/profile`. `displayName` and `email` are the account's public name and e-mail. */
export type CollectorProfile = {
  displayName: string
  username: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
  walletNickname: string
  /** A `data:` URL of the square avatar image, or `null` when the collector has none. Changed through `/auth/profile/avatar`. */
  avatarUrl: string | null
}

/** Body of `PATCH /auth/profile`. Password fields are omitted when the collector is not changing the password. */
export type ProfileUpdateRequest = Omit<CollectorProfile, 'avatarUrl'> & {
  currentPassword?: string
  newPassword?: string
}

/** Body of `PUT /auth/profile/avatar`: a PNG, JPEG or WebP `data:` URL (the client resizes it to 256 px first). */
export type AvatarUpdateRequest = { image: string }

export type ProfileUpdateResponse = {
  user: User
  profile: CollectorProfile
}

/** A wallet the collector can use at checkout and to receive purchased NFTs. */
export type CollectorWallet = {
  displayName: string
  walletNickname: string
  network: NetworkId
  profileName: string
  walletAddress: string
  secondaryAddress: string
  walletType: WalletId
  referralCode: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
}

export type CollectorWallets = {
  primary: CollectorWallet | null
  secondary: CollectorWallet | null
  /** When true, the secondary wallet is a copy of the primary one. */
  mirrorPrimary: boolean
}

export type WalletUpdateRequest =
  | { action: 'save'; slot: 'primary' | 'secondary'; wallet: CollectorWallet }
  | { action: 'mirror'; mirrorPrimary: boolean }

export type LoginRequest = {
  email: string
  password: string
}

export type SignupRequest = LoginRequest & {
  name: string
}

/** `token` is a bearer token sent as `Authorization: Bearer <token>`; `expiresAt` is ISO 8601. */
export type Session = {
  token: string
  expiresAt: string
  user: User
}

/** `GET /auth/session` does not echo the token back. */
export type SessionInfo = Omit<Session, 'token'>

export type FeaturedNft = Pick<Nft, 'id' | 'name' | 'image' | 'price'> & {
  imageAlt: string
}

export type FeaturedNftList = {
  data: FeaturedNft[]
}

export type NftFacets = {
  collections: Record<CollectionId, number>
  networks: Record<NetworkId, number>
  price: { min: EthAmount; max: EthAmount }
}
