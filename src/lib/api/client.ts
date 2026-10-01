import axios from 'axios'
import { notifySessionExpired, sessionToken } from '@/lib/auth/session-token'
import { toApiError } from './errors'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sessionToken.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Cancellations pass through untouched so TanStack Query can recognise aborted requests.
api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  const apiError = toApiError(error)
  const config = axios.isAxiosError(error) ? error.config : undefined
  const sentToken = Boolean(config?.headers?.Authorization)
  // Only a rejected token on a regular request means the session expired mid-use. A 401 from login is wrong
  // credentials, and the session check/logout already resolve a dead token to "visitor" on their own.
  const managesSession = config?.url?.startsWith('/auth/') ?? false
  if (apiError.code === 'UNAUTHENTICATED' && sentToken && !managesSession) notifySessionExpired()
  return Promise.reject(apiError)
})
