import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/errors'
import { subscribeNewsletter } from '@/lib/api/nfts'
import { cn } from '@/lib/utils'
import facebook from '@/assets/figma/social-facebook.svg'
import instagram from '@/assets/figma/social-instagram.svg'
import linkedin from '@/assets/figma/social-linkedin.svg'
import twitter from '@/assets/figma/social-twitter.svg'
import youtube from '@/assets/figma/social-youtube.svg'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  {
    id: 'criadores',
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const LINK_COLUMNS = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  {
    title: 'Central de ajuda',
    links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'],
  },
  { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
]

const SOCIALS = [
  { label: 'Facebook', icon: facebook },
  { label: 'Instagram', icon: instagram },
  { label: 'Twitter', icon: twitter },
  { label: 'LinkedIn', icon: linkedin },
  { label: 'YouTube', icon: youtube },
]

function Newsletter() {
  const subscription = useMutation({ mutationFn: subscribeNewsletter })

  return (
    <div className="flex flex-col gap-3 px-4 lg:w-[357px] lg:shrink-0">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const email = new FormData(event.currentTarget).get('email')
          subscription.mutate(String(email ?? ''))
        }}
      >
        <label htmlFor="newsletter-email" className="text-lg leading-4 font-bold">
          Antecipe-se ao próximo lançamento
        </label>
        <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark drop-shadow-[0_0_10px_rgb(10_6_4/0.45)] focus-within:ring-2 focus-within:ring-ring">
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={subscription.isError || undefined}
            aria-describedby="newsletter-status"
            placeholder="digite seu e-mail..."
            className="min-w-0 flex-1 bg-transparent pl-3 text-sm leading-4 outline-none placeholder:text-tertiary"
          />
          <Button
            type="submit"
            disabled={subscription.isPending}
            className="h-10 w-[85px] rounded-none rounded-r-md bg-primary pl-4 pr-1 text-lg leading-4 font-bold hover:bg-primary/80"
          >
            Enviar
          </Button>
        </div>
      </form>
      <p id="newsletter-status" className="text-[13px] leading-[22px] text-muted-foreground" aria-live="polite">
        {subscription.isSuccess
          ? 'Inscrição confirmada! Você vai receber as próximas novidades.'
          : subscription.isError
            ? getErrorMessage(subscription.error)
            : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('flex flex-col', className)}>
      <div className="flex flex-col gap-8 bg-card p-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-0">
        {FEATURES.map(({ letter, title, text, id }) => (
          <div key={title} id={id} className="flex scroll-mt-8 flex-col gap-3 px-4 lg:min-w-0 lg:flex-1 lg:border-r lg:border-primary">
            <span aria-hidden className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {letter}
            </span>
            <h2 className="text-[17px] leading-4 font-bold">{title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-muted-foreground">{text}</p>
          </div>
        ))}
        <Newsletter />
      </div>

      <div className="grid gap-4 bg-surface-dark px-8 py-6 text-sm leading-[22px] sm:grid-cols-2 lg:flex lg:h-[88px] lg:items-center lg:gap-[92px] lg:py-0">
        <p className="font-bold tracking-[1.4px] lg:flex-1">KURIO</p>
        <p className="lg:flex-1 lg:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="hover:text-brand lg:flex-1">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-brand lg:w-[228px]">
          +55 11 4002 8922
        </a>
      </div>

      <div className="bg-card p-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:flex lg:gap-[124px]">
          {LINK_COLUMNS.map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-2 lg:flex-1">
              <h2 className="text-lg leading-4 font-bold">{title}</h2>
              <ul className="text-sm leading-[30px]">
                {links.map((link) => (
                  <li key={link}>
                    {link === 'Meu perfil' ? (
                      <Link to="/profile" className="hover:text-brand">
                        {link}
                      </Link>
                    ) : (
                      link
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-8 lg:w-[228px]">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
              <ul className="flex gap-2.5">
                {SOCIALS.map(({ label, icon }) => (
                  <li key={label}>
                    <img src={icon} alt={label} width={30} height={30} className="rounded-[5px]" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
              <p className="flex h-[26px] items-center justify-center rounded-md border border-border-soft bg-surface-dark text-[9px] font-bold tracking-[0.1px] whitespace-pre text-brand">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
