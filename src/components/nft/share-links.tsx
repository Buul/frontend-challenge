import emailIcon from '@/assets/figma/share-email.svg'
import linkedinIcon from '@/assets/figma/share-linkedin.svg'
import twitterIcon from '@/assets/figma/share-twitter.svg'

export function ShareLinks({ name, url }: { name: string; url: string }) {
  const text = `Confira ${name} na Kurio`
  const links = [
    {
      label: 'Compartilhar no LinkedIn (abre em nova aba)',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <img src={linkedinIcon} alt="" width={15} height={14.38} />,
      external: true,
    },
    {
      label: 'Compartilhar por e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: (
        <span className="grid size-[18px] place-items-center">
          <img src={emailIcon} alt="" width={15} height={12} />
        </span>
      ),
      external: false,
    },
    {
      label: 'Compartilhar no X/Twitter (abre em nova aba)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <img src={twitterIcon} alt="" width={15.97} height={12.19} />,
      external: true,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-2">
        {links.map(({ label, href, icon, external }) => (
          <li key={label} className="flex">
            <a
              href={href}
              aria-label={label}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
              className="flex items-center rounded-sm transition-opacity hover:opacity-75"
            >
              {icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
