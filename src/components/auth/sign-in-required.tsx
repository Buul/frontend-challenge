import { useNavigate } from '@tanstack/react-router'
import { InlineAlert } from '@/components/ui/inline-alert'
import { authIntent } from '@/lib/auth/auth-dialog'

type AccountPath = '/profile' | '/wallets'

/** Shown to visitors on account screens: opens the login and comes back to `path` afterwards. */
export function SignInRequired({ message, notice, path }: { message: string; notice: string; path: AccountPath }) {
  const navigate = useNavigate()
  return (
    <InlineAlert
      message={message}
      action={{
        label: 'Entrar',
        onClick: () => {
          authIntent.set({ notice })
          void navigate({ to: path, search: { auth: 'login', redirect: path } })
        },
      }}
    />
  )
}
