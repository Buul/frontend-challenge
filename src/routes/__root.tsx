import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { LoginDialog } from '@/components/auth/login-dialog'
import { SessionSync } from '@/components/auth/session-sync'
import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'
import { sessionQueryOptions } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/errors'
import { validateAuthSearch } from '@/lib/auth/auth-dialog'

const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : () => null

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: validateAuthSearch,
  // Awaited so private screens and the header know who is signed in before rendering.
  beforeLoad: ({ context }) => context.queryClient.ensureQueryData(sessionQueryOptions()).catch(() => null),
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <SessionSync />
      <LoginDialog />
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
