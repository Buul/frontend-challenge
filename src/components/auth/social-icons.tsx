import facebook from '@/assets/figma/auth-facebook.svg'
import google1 from '@/assets/figma/google-1.svg'
import google2 from '@/assets/figma/google-2.svg'
import google3 from '@/assets/figma/google-3.svg'
import google4 from '@/assets/figma/google-4.svg'
import google5 from '@/assets/figma/google-5.svg'
import google6 from '@/assets/figma/google-6.svg'
import google7 from '@/assets/figma/google-7.svg'

// The Figma mark is exported as seven separate shapes; these boxes reproduce its layout inside 20×20.
const GOOGLE_PARTS = [
  { src: google1, className: 'inset-[57.68%_17.83%_0_7.11%]' },
  { src: google2, className: 'top-[71.33%] right-[17.83%] bottom-0 left-1/2' },
  { src: google3, className: 'inset-[24.69%_75.25%_24.69%_0]' },
  { src: google4, className: 'inset-[38.28%_0_11.97%_47.07%]' },
  { src: google5, className: 'top-[38.28%] right-0 bottom-[11.97%] left-1/2' },
  { src: google6, className: 'inset-[0_17.01%_57.68%_7.11%]' },
  { src: google7, className: 'top-0 right-[17.01%] bottom-[70.51%] left-1/2' },
]

export function GoogleIcon() {
  return (
    <span aria-hidden className="relative block size-5 shrink-0 overflow-hidden">
      {GOOGLE_PARTS.map(({ src, className }) => (
        <span key={src} className={`absolute ${className}`}>
          <img src={src} alt="" className="absolute inset-0 block size-full max-w-none" />
        </span>
      ))}
    </span>
  )
}

export function FacebookIcon() {
  return <img src={facebook} alt="" width={20} height={20} className="shrink-0" />
}
