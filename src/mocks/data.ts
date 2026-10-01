import emeraldApe from '@/assets/figma/nft-emerald-ape.jpg'
import goldenBeat from '@/assets/figma/nft-golden-beat.jpg'
import neonVessel from '@/assets/figma/nft-neon-vessel.jpg'
import sageNomad from '@/assets/figma/nft-sage-nomad.jpg'
import { COLLECTIONS, NETWORKS, type FeaturedNft, type Nft, type NftDetail, type NftEdition } from '@/lib/api/types'

type Seed = Pick<Nft, 'name' | 'image' | 'price'> & Partial<Nft>

const FEATURED: Seed[] = [
  { name: 'Emerald Ape #042', image: emeraldApe, price: '1.19', isTrending: true },
  { name: 'Sage Nomad #009', image: sageNomad, price: '1.69' },
  { name: 'Neon Vessel #552', image: neonVessel, price: '1.99', previousPrice: '2.29', isTrending: true, isRare: true },
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
  isRare: i % 7 === 3,
}))

const NOW = Date.parse('2026-09-30T12:00:00Z')
const HOUR = 3_600_000

// Every NFT offers the four editions from the design; some are sold out so the detail page exercises unavailable editions.
const editionsFor = (index: number): NftEdition[] => [
  { id: '1-1', label: '1/1', supply: 1, available: index % 3 === 0 ? 0 : 1, maxPerOrder: 1 },
  { id: '1-10', label: '1/10', supply: 10, available: index % 4 === 0 ? 0 : 10 - (index % 7), maxPerOrder: 2 },
  { id: '1-50', label: '1/50', supply: 50, available: index % 11 === 5 ? 0 : 50 - ((index * 7) % 45), maxPerOrder: 5 },
  { id: 'open', label: 'ABERTA', supply: null, available: 999, maxPerOrder: 10 },
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
  isRare: false,
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

const COLLECTION_CONTRACTS: Record<string, string> = {
  'Kurio Apes': '0x7A42c0f1b3d4e5a6978812ab34cd56ef780019E8',
  'Kurio Nomads': '0x3B91e2a4c6d8f0b1a3c5e7d9f1b3a5c7e9d1A0F4',
  'Kurio Signals': '0x5C17d3b5f7a9c1e3b5d7f9a1c3e5b7d9f1a3B62D',
}
const COLLECTION_NAMES = Object.keys(COLLECTION_CONTRACTS)
const CREATORS = ['Nova Sato', 'Iris Vale', 'Theo Rocha']
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Chapéu', 'Fones', 'Jaqueta', 'Dourado', 'Neon', 'Moletom', 'Brinco']
const REVIEWERS = ['Lia Costa', 'Rafael Mendes', 'Bianca Oliveira', 'Caio Prado', 'Marina Duarte']
const REVIEW_COMMENTS = [
  'Arte impecável e entrega instantânea na carteira. A procedência verificada passa muita confiança.',
  'Os detalhes em alta resolução são ainda melhores do que na prévia. Recomendo a coleção inteira.',
  'Ótimo acesso aos lançamentos exclusivos. A comunidade de colecionadores é muito ativa.',
  'Bonito, mas gostaria de mais variações de atributos nesta edição.',
]
const DAY = 24 * HOUR

// Featured seeds all belong to the design's "Kurio Apes" collection; generated ones are spread across the others.
const collectionNameFor = (index: number) => (index < FEATURED.length ? COLLECTION_NAMES[0] : COLLECTION_NAMES[index % 3])

function buildDetail(nft: Nft, index: number): NftDetail {
  const collectionName = collectionNameFor(index)
  const creator = CREATORS[index % CREATORS.length]
  const network = NETWORKS.find(({ id }) => id === nft.network)!.label
  const royaltyPercent = 5
  const rating = index === 0 ? 4.8 : Math.round(36 + ((index * 3) % 15)) / 10
  const reviewCount = index === 0 ? 19 : index % 9 === 8 ? 0 : 1 + ((index * 7) % 40)
  const mainAlt = FEATURED_ALTS[nft.id] ?? `Arte do NFT ${nft.name}`

  return {
    ...nft,
    summary: `Um colecionável digital finalizado à mão da coleção ${collectionName}, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${nft.name} é uma obra digital finalizada à mão da coleção ${collectionName}. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe ${royaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    tokenId: `#${nft.name.split('#')[1].padStart(4, '0')}`,
    collectionName,
    creator,
    attributes: [ATTRIBUTES[index % ATTRIBUTES.length], ATTRIBUTES[(index + 1) % ATTRIBUTES.length], nft.isRare ? 'Raro' : 'Comum'],
    // The design shows the same artwork in every gallery slot; the fixtures mirror it.
    images: Array.from({ length: 4 }, (_, i) => ({ src: nft.image, alt: i === 0 ? mainAlt : `${mainAlt} (imagem ${i + 1} de 4)` })),
    rating,
    reviewCount,
    reviews: Array.from({ length: Math.min(reviewCount, 3) }, (_, i) => ({
      id: `${nft.id}-review-${i + 1}`,
      author: REVIEWERS[(index + i) % REVIEWERS.length],
      rating: Math.max(1, Math.min(5, Math.round(rating) - (i % 2))),
      comment: REVIEW_COMMENTS[(index + i) % REVIEW_COMMENTS.length],
      createdAt: new Date(NOW - (i * 3 + 1) * DAY).toISOString(),
    })),
    provenance: `Cunhado na ${network} com procedência imutável e metadados armazenados no IPFS.`,
    contract: { address: COLLECTION_CONTRACTS[collectionName], standard: nft.network === 'solana' ? 'Metaplex' : 'ERC-721' },
    royaltyPercent,
  }
}

export const nftDetails = new Map(nfts.map((nft, index) => [nft.id, buildDetail(nft, index)]))

const RELATED_LIMIT = 15

export const relatedNfts = (id: string) => {
  const collectionName = nftDetails.get(id)?.collectionName
  return nfts
    .filter((nft) => nft.id !== id && nftDetails.get(nft.id)?.collectionName === collectionName)
    .toSorted((a, b) => b.listedAt.localeCompare(a.listedAt))
    .slice(0, RELATED_LIMIT)
}
