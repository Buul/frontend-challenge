import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { SessionSync } from '@/components/auth/session-sync'
import { StatusPage } from '@/components/layout/status-page'
import { RealtimeSync } from '@/components/realtime/realtime-sync'
import { Button } from '@/components/ui/button'
import { sessionQueryOptions } from '@/lib/api/auth'
import { cartQueryOptions } from '@/lib/api/cart'
import { getErrorMessage } from '@/lib/api/errors'
import { validateAuthSearch } from '@/lib/auth/auth-dialog'

const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : () => null

// Login/signup (with their form library) stay out of the first bundle: they load when `?auth=` first appears,
// or while the browser is idle after the first paint, so opening the dialog is still instant.
const loadAuthDialog = () => import('@/components/auth/auth-dialog')
const AuthDialog = lazy(() => loadAuthDialog().then((module) => ({ default: module.AuthDialog })))

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
    return context.queryClient.ensureQueryData(sessionQueryOptions()).catch(() => null)
  },
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootLayout() {
  const { auth } = Route.useSearch()
  // Once mounted it stays mounted, so closing still animates and hands focus back.
  const [authNeeded, setAuthNeeded] = useState(auth !== undefined)
  if (auth !== undefined && !authNeeded) setAuthNeeded(true)

  useEffect(() => {
    const preload = () => void loadAuthDialog()
    // Safari has no `requestIdleCallback`.
    const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined
    if (idle) {
      const id = idle(preload, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(preload, 2000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <Outlet />
      <SessionSync />
      <RealtimeSync />
      {authNeeded && (
        <Suspense>
          <AuthDialog />
        </Suspense>
      )}
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}

function NotFound() {
  return (
    <StatusPage title="Página não encontrada" description="O endereço acessado não existe ou foi removido.">
      <Button render={<Link to="/" />} nativeButton={false} className="rounded-md font-bold">
        Voltar ao início
      </Button>
    </StatusPage>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <StatusPage title="Algo deu errado" description={getErrorMessage(error)}>
      <div role="alert" className="flex gap-3">
        <Button
          className="rounded-md font-bold"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          Tentar novamente
        </Button>
      </div>
    </StatusPage>
  )
}
