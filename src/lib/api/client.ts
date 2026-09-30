import axios from 'axios'
import { toApiError } from './errors'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Cancellations pass through untouched so TanStack Query can recognise aborted requests.
api.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(axios.isCancel(error) ? error : toApiError(error)),
)
