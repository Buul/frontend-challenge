import type { AnyFormApi } from '@tanstack/react-form'
import type { FormEvent } from 'react'
import { ApiError, getErrorMessage } from '@/lib/api/errors'

/** Field errors that already appear on the inputs; the banner above the button hides them. */
export function formErrorMessage(error: unknown, hidden: readonly string[] = ['VALIDATION_ERROR']) {
  if (!error) return
  if (error instanceof ApiError && hidden.includes(error.code)) return
  return getErrorMessage(error)
}

export function handleAuthSubmit(event: FormEvent<HTMLFormElement>, pending: boolean, submit: () => void | Promise<void>, onStart?: () => void) {
  event.preventDefault()
  if (pending) return
  onStart?.()
  void submit()
}

/** First message of a field's errors; schema validators report issue objects, server errors are set the same way. */
export function fieldError(errors: readonly unknown[]): string | undefined {
  const [first] = errors
  if (typeof first === 'string') return first
  if (typeof first === 'object' && first !== null && 'message' in first && typeof first.message === 'string') return first.message
}

/**
 * Shows the API's `fieldErrors` on the fields. They are stored as form-level submit errors, so they clear as soon as
 * the field changes and are recomputed on the next submit. Returns the first affected field, in `order`.
 */
export function setServerErrors<TField extends string>(form: AnyFormApi, order: readonly TField[], fieldErrors: Record<string, string>) {
  for (const [field, message] of Object.entries(fieldErrors)) {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      errorMap: { ...prev.errorMap, onSubmit: [{ message }] },
      errorSourceMap: { ...prev.errorSourceMap, onSubmit: 'form' },
    }))
  }
  return order.find((field) => fieldErrors[field])
}

/** First field with an error, in `order`; used to move focus there after a failed submit. */
export const firstInvalidField = <TField extends string>(form: AnyFormApi, order: readonly TField[]) =>
  order.find((field) => (form.getFieldMeta(field)?.errors.length ?? 0) > 0)
