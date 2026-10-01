import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { sessionToken } from '@/lib/auth/session-token'
import { api } from './client'
import { ApiError } from './errors'
import type { LoginRequest, Session, SessionInfo } from './types'

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

/** Id of the signed-in user according to the cache; late mutation callbacks use it to avoid writing into another user's data. */
export const currentUserId = (queryClient: QueryClient) =>
  queryClient.getQueryData<SessionInfo | null>(sessionKeys.current)?.user.id

export async function endSession(queryClient: QueryClient) {
  sessionToken.clear()
  await clearPrivateData(queryClient)
  queryClient.setQueryData(sessionKeys.current, null)
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // A leftover token must not ride along: a 401 here means wrong credentials, not an expired session.
      sessionToken.clear()
      return (await api.post<Session>('/auth/login', credentials)).data
    },
    onSuccess: async ({ token, ...session }) => {
      await clearPrivateData(queryClient)
      sessionToken.set(token)
      queryClient.setQueryData(sessionKeys.current, session)
    },
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
