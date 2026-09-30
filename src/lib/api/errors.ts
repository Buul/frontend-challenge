import axios from 'axios'

const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN_ERROR'

/** Body returned by the API for every non-2xx response. */
export type ApiErrorBody = {
  code: ApiErrorCode
  message: string
  fieldErrors?: Record<string, string>
}

const DEFAULT_MESSAGES: Record<ApiErrorCode | ClientErrorCode, string> = {
  VALIDATION_ERROR: 'Verifique os dados informados.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  NOT_FOUND: 'Recurso não encontrado.',
  CONFLICT: 'Os dados mudaram. Revise e tente novamente.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um instante.',
  INTERNAL_ERROR: 'O servidor encontrou um erro. Tente novamente.',
  SERVICE_UNAVAILABLE: 'Serviço indisponível no momento. Tente novamente.',
  NETWORK_ERROR: 'Não foi possível conectar ao servidor.',
  TIMEOUT: 'O servidor demorou para responder.',
  UNKNOWN_ERROR: 'Algo inesperado aconteceu.',
}

const STATUS_CODES: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
}

export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: ApiErrorCode | ClientErrorCode
  readonly fieldErrors: Record<string, string>

  constructor(init: {
    code: ApiErrorCode | ClientErrorCode
    status?: number
    message?: string
    fieldErrors?: Record<string, string>
    cause?: unknown
  }) {
    super(init.message ?? DEFAULT_MESSAGES[init.code], { cause: init.cause })
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.fieldErrors = init.fieldErrors ?? {}
  }

  /** Transient failures that are safe to retry for idempotent requests. */
  get retryable() {
    return this.status === undefined ? this.code !== 'UNKNOWN_ERROR' : this.status === 429 || this.status >= 500
  }
}

const isApiErrorBody = (data: unknown): data is ApiErrorBody =>
  typeof data === 'object' &&
  data !== null &&
  API_ERROR_CODES.includes((data as ApiErrorBody).code) &&
  typeof (data as ApiErrorBody).message === 'string'

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!axios.isAxiosError(error)) return new ApiError({ code: 'UNKNOWN_ERROR', cause: error })

  const { response } = error
  if (!response) {
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    return new ApiError({ code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR', cause: error })
  }

  const body = isApiErrorBody(response.data) ? response.data : undefined
  return new ApiError({
    code: body?.code ?? STATUS_CODES[response.status] ?? 'INTERNAL_ERROR',
    status: response.status,
    message: body?.message,
    fieldErrors: body?.fieldErrors,
    cause: error,
  })
}

export const getErrorMessage = (error: unknown) => toApiError(error).message
