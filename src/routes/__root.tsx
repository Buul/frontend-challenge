import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/errors'

const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : () => null

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootLayout() {
  return (
    <>
      <Outlet />
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
