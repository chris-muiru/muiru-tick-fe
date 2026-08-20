import { createSignal } from 'solid-js'
import type { z } from 'zod'

/**
 * Minimal zod form binding, same shape as muiru-watch's.
 *
 * Validate a field on blur, validate everything on submit, keep errors keyed by
 * field. Errors clear as soon as a field is edited: leaving a message under a
 * field somebody is actively fixing reads as though the fix did not work.
 */
export function useZodForm<S extends z.ZodObject<z.ZodRawShape>>(schema: S) {
  type Values = z.infer<S>
  const [errors, setErrors] = createSignal<Partial<Record<keyof Values, string>>>({})

  const validateField = (field: keyof Values, values: Values) => {
    const result = schema.safeParse(values)
    if (result.success) {
      setErrors((current) => ({ ...current, [field]: undefined }))
      return
    }
    const issue = result.error.issues.find((i) => i.path[0] === field)
    setErrors((current) => ({ ...current, [field]: issue?.message }))
  }

  const clearField = (field: keyof Values) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))

  /** Returns parsed values on success, or null after populating every error. */
  const validateAll = (values: Values): Values | null => {
    const result = schema.safeParse(values)
    if (result.success) {
      setErrors(() => ({}))
      return result.data as Values
    }
    const next: Partial<Record<keyof Values, string>> = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Values
      if (field && !next[field]) next[field] = issue.message
    }
    setErrors(() => next)
    return null
  }

  /** The first message, for a form-level summary near the submit button. */
  const firstError = () => Object.values(errors()).find(Boolean) as string | undefined

  return { errors, validateField, clearField, validateAll, firstError }
}
