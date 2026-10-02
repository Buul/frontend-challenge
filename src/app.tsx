import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, parseSearchWith, RouterProvider, stringifySearchWith } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from './lib/api/errors'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && error.retryable,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  // Search values stay raw strings (no JSON coercion) so ETH decimals keep full precision;
  // each route's validateSearch is responsible for parsing them.
  parseSearch: parseSearchWith((value) => value),
  stringifySearch: stringifySearchWith(JSON.stringify),
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
