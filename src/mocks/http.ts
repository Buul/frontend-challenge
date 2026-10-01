import { HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/errors'

const apiError = (status: number, code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) =>
  HttpResponse.json<ApiErrorBody>({ code, message, ...(fieldErrors && { fieldErrors }) }, { status })

export const unauthenticated = (message = 'Sua sessão expirou. Entre novamente.') =>
  apiError(401, 'UNAUTHENTICATED', message)

export const notFound = (message: string) => apiError(404, 'NOT_FOUND', message)

export const serviceUnavailable = (message = 'Serviço indisponível no momento. Tente novamente.') =>
  apiError(503, 'SERVICE_UNAVAILABLE', message)

export const validationError = (fieldErrors: Record<string, string>, message = 'Parâmetros inválidos.') =>
  apiError(422, 'VALIDATION_ERROR', message, fieldErrors)
