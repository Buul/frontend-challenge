import sageNomad from '@/assets/figma/nft-sage-nomad.jpg'

const bubble = 'absolute rounded-[29px] bg-[linear-gradient(145deg,rgb(210_138_76/0.3)_46%,rgb(210_138_76/0)_103%)]'

export function FeaturedBanner() {
  return (
    <section
      aria-labelledby="featured-title"
      className="relative flex flex-col gap-4 overflow-hidden bg-linear-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1"
    >
      <div className="flex flex-col gap-4 px-5">
        <h2 id="featured-title" className="text-2xl leading-8 font-bold text-brand">
          NFT EM DESTAQUE
        </h2>
        <p className="text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      <img
        src={sageNomad}
        alt="Sage Nomad #009: gorila com chapéu bucket e moletom roxo"
        width={310}
        height={368}
        loading="lazy"
        className="h-[368px] w-full rounded-[22px] object-cover"
      />
      <span aria-hidden className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20" />
      <span aria-hidden className={`${bubble} top-[343px] left-[248px] size-[45px]`} />
      <span aria-hidden className={`${bubble} top-[105px] left-[38px] size-[15px]`} />
    </section>
  )
}
