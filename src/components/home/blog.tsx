import emeraldApe from '@/assets/figma/nft-emerald-ape.jpg'
import goldenBeat from '@/assets/figma/nft-golden-beat.jpg'
import neonVessel from '@/assets/figma/nft-neon-vessel.jpg'
import sageNomad from '@/assets/figma/nft-sage-nomad.jpg'

const POSTS = [
  {
    date: '12 de setembro',
    readTime: 6,
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: neonVessel,
  },
  {
    date: '13 de setembro',
    readTime: 2,
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    image: emeraldApe,
  },
  {
    date: '15 de setembro',
    readTime: 3,
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: sageNomad,
  },
  {
    date: '15 de setembro',
    readTime: 2,
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: goldenBeat,
  },
]

export function Blog() {
  return (
    <section id="blog" aria-labelledby="blog-title" className="flex flex-col items-center gap-10">
      <div className="flex flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-[28px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-muted-foreground">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-[repeat(4,268px)]">
        {POSTS.map((post) => (
          <article key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-card">
            <img src={post.image} alt="" width={268} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-muted-foreground">
                {`${post.date}  |  Leitura de ${post.readTime} min`}
              </p>
              <h3 className="text-base font-bold">{post.title}</h3>
              <p className="text-xs leading-4 font-medium text-muted-foreground">{post.excerpt}</p>
              {/* Editorial pages are out of scope, so this is decorative text rather than a link to nowhere. */}
              <p aria-hidden className="flex gap-1 text-xs text-brand">
                <span className="leading-[14px] font-bold">Ler mais</span>
                <span>→</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
