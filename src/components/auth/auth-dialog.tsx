import { useSearch } from '@tanstack/react-router'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/use-media-query'
import { getReturnFocus, useAuthDialog } from '@/lib/auth/auth-dialog'
import { cn } from '@/lib/utils'
import { LoginForm } from './login-form'
import { SignupForm } from './signup-form'

/** Login and signup share one dialog, driven by `?auth=login|signup`; switching modes keeps it open. */
export function AuthDialog() {
  const { auth } = useSearch({ strict: false })
  const { close } = useAuthDialog()
  const isMobile = useIsMobile()

  return (
    <Dialog open={auth !== undefined} onOpenChange={(open) => !open && close()}>
      <DialogContent
        finalFocus={getReturnFocus}
        className={cn(
          'overflow-y-auto',
          isMobile
            ? 'inset-0 h-dvh max-h-none w-full max-w-none translate-0 rounded-none bg-background'
            : 'w-[500px] max-w-[calc(100vw-2rem)] rounded-none bg-card',
        )}
      >
        {auth === 'signup' ? <SignupForm isMobile={isMobile} /> : <LoginForm isMobile={isMobile} />}
      </DialogContent>
    </Dialog>
  )
}
