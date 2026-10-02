import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { sessionToken } from '@/lib/auth/session-token'
import { cartKeys } from './cart'
import { api } from './client'
import { ApiError } from './errors'
import type { LoginRequest, Session, SessionInfo, SignupRequest } from './types'

export const sessionKeys = { current: ['session'] as const }

/**
 * Every query and mutation holding a user's data is keyed under `['me', userId, ...]`, so it is isolated per user
 * and can be dropped as a whole on logout, expiry or user switch.
 */
export const privateKey = <const T extends readonly unknown[]>(userId: string, ...parts: T) => ['me', userId, ...parts] as const
const PRIVATE_ROOT = ['me'] as const

/** Resolves to `null` for visitors; a rejected token also resolves to `null` instead of failing the query. */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: sessionKeys.current,
    queryFn: async ({ signal }): Promise<SessionInfo | null> => {
      if (!sessionToken.get()) return null
      try {
        return (await api.get<SessionInfo>('/auth/session', { signal })).data
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error
        sessionToken.clear()
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
  })

export function useSession() {
  const session = useQuery(sessionQueryOptions())
  return { ...session, user: session.data?.user }
}

/** Drops every private query and pending mutation so nothing from the previous user leaks into the next one. */
export async function clearPrivateData(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: PRIVATE_ROOT })
  queryClient.removeQueries({ queryKey: PRIVATE_ROOT })
  const mutations = queryClient.getMutationCache()
  mutations.findAll({ mutationKey: PRIVATE_ROOT }).forEach((mutation) => mutations.remove(mutation))
}

/**
 * The cart belongs to whoever is signed in (or to the visitor), so it is refetched whenever the identity changes.
 * Call it after the token changed, so the refetch speaks for the new identity.
 */
export function resetCart(queryClient: QueryClient) {
  return queryClient.resetQueries({ queryKey: cartKeys.current })
}

/** Id of the signed-in user according to the cache; late mutation callbacks use it to avoid writing into another user's data. */
export const currentUserId = (queryClient: QueryClient) =>
  queryClient.getQueryData<SessionInfo | null>(sessionKeys.current)?.user.id

export async function endSession(queryClient: QueryClient) {
  sessionToken.clear()
  await clearPrivateData(queryClient)
  queryClient.setQueryData(sessionKeys.current, null)
  void resetCart(queryClient)
}

async function startSession(queryClient: QueryClient, { token, ...session }: Session) {
  await clearPrivateData(queryClient)
  sessionToken.set(token)
  queryClient.setQueryData(sessionKeys.current, session)
  // The server moved the visitor's cart into the account on login; show the account's cart.
  void resetCart(queryClient)
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // A leftover token must not ride along: a 401 here means wrong credentials, not an expired session.
      sessionToken.clear()
      return (await api.post<Session>('/auth/login', credentials)).data
    },
    onSuccess: (session) => startSession(queryClient, session),
  })
}

/** Creates the account and signs it in, replacing any previous session. */
export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignupRequest) => {
      sessionToken.clear()
      return (await api.post<Session>('/auth/register', input)).data
    },
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    // The server call is best effort: the local session ends even if it fails.
    mutationFn: () => api.post('/auth/logout').catch(() => undefined),
    onSettled: () => endSession(queryClient),
  })
}
