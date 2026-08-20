import { z } from 'zod'

/**
 * Job form schema.
 *
 * These mirror the CHECK constraints in migration 0002 rather than inventing
 * their own limits — the 60s interval floor, the 1–300s timeout, the 1–10
 * attempt range all exist in the database, and a form that permits what
 * Postgres rejects only moves the error later and makes it uglier.
 *
 * Cron syntax is deliberately absent. It is validated server-side by the same
 * parser the scheduler uses, through /schedule/preview, so the UI can never
 * bless an expression the scheduler would refuse.
 */

const httpUrl = z
  .string()
  .trim()
  .min(1, 'A URL is required — this is the thing we call.')
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'Must start with http:// or https://',
  })
  .refine((value) => !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|169\.254\.)/i.test(value), {
    message: 'Private and loopback addresses are refused. The endpoint must be reachable from the internet.',
  })

export const jobSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Give it a name you will recognise in an alert at 3am.')
      .max(120, 'Keep the name under 120 characters.'),

    url: httpUrl,

    timezone: z
      .string()
      .trim()
      .min(1, 'A timezone decides when this actually fires.')
      .refine(
        (value) => {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value })
            return true
          } catch {
            return false
          }
        },
        { message: 'Use an IANA timezone such as Africa/Nairobi or UTC.' },
      ),

    intervalSeconds: z
      .number({ message: 'Enter a number of seconds.' })
      .int('Whole seconds only.')
      .min(60, 'The shortest supported interval is 60 seconds.'),

    timeoutMs: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(1000, 'A timeout under a second will fail on ordinary latency.')
      .max(300_000, 'The ceiling is 300 seconds.'),

    maxRedirects: z.number().int().min(0).max(10, 'Ten redirects is already generous.'),

    successStatusFrom: z.number().int().min(100).max(599),
    successStatusTo: z.number().int().min(100).max(599),

    retryMaxAttempts: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(1, 'At least one attempt. Set 1 to never retry.')
      .max(10, 'Past ten attempts you are hammering a service that is clearly down.'),

    retryBaseDelayMs: z.number().int().min(1000, 'At least one second.').max(3_600_000),
    retryMaxDelayMs: z.number().int().min(1000).max(21_600_000, 'Six hours is the ceiling.'),

    maxQueueDepth: z.number().int().min(1).max(100, 'Deeper than 100 and the queue is the problem.'),

    catchupWindowSeconds: z.number().int().min(0).max(86_400, 'A catch-up window longer than a day is not catch-up.'),
    catchupMaxOccurrences: z.number().int().min(1).max(500),

    alertAfterFailures: z
      .number({ message: 'Enter a number.' })
      .int()
      .min(1, 'At least one failure before anyone is told.')
      .max(50, 'Past 50 failures nobody is being told in time to matter.'),

    autoPauseAfter: z
      .number()
      .int()
      .min(5, 'Pausing before five consecutive failures is too twitchy.')
      .max(1000)
      .nullable(),

    latenessBudgetMs: z
      .number()
      .int()
      .min(1000, 'A budget under a second will alert on ordinary scheduling jitter.')
      .nullable(),

    webhookUrl: z.union([z.literal(''), httpUrl]),
  })
  .refine((form) => form.successStatusTo >= form.successStatusFrom, {
    message: 'The upper bound must not be below the lower one.',
    path: ['successStatusTo'],
  })
  .refine((form) => form.retryMaxDelayMs >= form.retryBaseDelayMs, {
    message: 'The longest delay cannot be shorter than the first one.',
    path: ['retryMaxDelayMs'],
  })

export type JobSchemaValues = z.infer<typeof jobSchema>
