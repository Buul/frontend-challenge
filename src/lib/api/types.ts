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

export type CollectionId = (typeof COLLECTIONS)[number]['id']
export type NetworkId = (typeof NETWORKS)[number]['id']
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

/** Ids of the NFTs favorited by the current visitor. */
export type FavoriteList = {
  data: string[]
}

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
