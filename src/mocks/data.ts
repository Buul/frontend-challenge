import emeraldApe from '@/assets/figma/nft-emerald-ape.jpg'
import goldenBeat from '@/assets/figma/nft-golden-beat.jpg'
import neonVessel from '@/assets/figma/nft-neon-vessel.jpg'
import sageNomad from '@/assets/figma/nft-sage-nomad.jpg'
import { COLLECTIONS, NETWORKS, type FeaturedNft, type Nft, type NftEdition } from '@/lib/api/types'

type Seed = Pick<Nft, 'name' | 'image' | 'price'> & Partial<Nft>

const FEATURED: Seed[] = [
  { name: 'Emerald Ape #042', image: emeraldApe, price: '1.19', isTrending: true },
  { name: 'Sage Nomad #009', image: sageNomad, price: '1.69' },
  { name: 'Neon Vessel #552', image: neonVessel, price: '1.99', previousPrice: '2.29', isTrending: true },
  { name: 'Cosmic Bloom #118', image: sageNomad, price: '1.29' },
  { name: 'Violet Nomad #314', image: sageNomad, price: '1.39' },
  { name: 'Ivory Baron #088', image: neonVessel, price: '1.79' },
  { name: 'Golden Beat #207', image: goldenBeat, price: '0.99', isTrending: true },
  { name: 'Golden Pulse #183', image: goldenBeat, price: '1.09' },
  { name: 'Golden Signal #160', image: goldenBeat, price: '0.39' },
]

const PREFIXES = ['Amber', 'Rust', 'Velvet', 'Onyx', 'Copper', 'Jade', 'Dusk', 'Ember', 'Mossy']
const SUFFIXES = ['Ape', 'Nomad', 'Baron', 'Vessel', 'Beat', 'Bloom']
const IMAGES = [emeraldApe, sageNomad, neonVessel, goldenBeat]
const PRICES = ['0.02', '0.45', '2.49', '3.1', '0.75', '5.2', '12.3', '0.88', '1.55', '7.4', '0.62', '4.05', '2.95', '9.9']

const GENERATED: Seed[] = Array.from({ length: 27 }, (_, i) => ({
  name: `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[i % SUFFIXES.length]} #${String(200 + i * 13).padStart(3, '0')}`,
  image: IMAGES[i % IMAGES.length],
  price: PRICES[i % PRICES.length],
  isTrending: i % 5 === 0,
}))

const NOW = Date.parse('2026-09-30T12:00:00Z')
const HOUR = 3_600_000

const editionsFor = (index: number): NftEdition[] => [
  { id: 'standard', label: 'Padrão', supply: 50, available: index % 11 === 5 ? 0 : 50 - ((index * 7) % 45), maxPerOrder: 5 },
  { id: 'gold', label: 'Ouro', supply: 5, available: index % 4 === 1 ? 0 : (index % 5) + 1, maxPerOrder: 1 },
]

export const nfts: Nft[] = [...FEATURED, ...GENERATED].map((seed, index) => ({
  id: `nft-${index + 1}`,
  version: 1,
  updatedAt: new Date(NOW).toISOString(),
  collection: COLLECTIONS[index % COLLECTIONS.length].id,
  network: NETWORKS[index % NETWORKS.length].id,
  listedAt: new Date(NOW - index * 7 * HOUR).toISOString(),
  isNew: index < 12,
  isTrending: false,
  editions: editionsFor(index),
  ...seed,
}))

const FEATURED_ALTS: Record<string, string> = {
  'nft-1': 'Emerald Ape #042: macaco com óculos verdes e jaqueta college verde',
  'nft-3': 'Neon Vessel #552: chimpanzé com brinco dourado, gola alta verde e blazer bege',
  'nft-7': 'Golden Beat #207: macaco dourado com fones de ouvido verdes e jaqueta bomber creme',
  'nft-2': 'Sage Nomad #009: gorila com chapéu bucket e moletom roxo',
}

export const featuredNfts: FeaturedNft[] = Object.entries(FEATURED_ALTS).map(([id, imageAlt]) => {
  const { name, image, price } = nfts.find((nft) => nft.id === id)!
  return { id, name, image, price, imageAlt }
})
