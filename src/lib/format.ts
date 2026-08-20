export function relativeTime(iso?: string | null): string {
  if (!iso) return 'never'
  const elapsed = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (elapsed < 0) return `in ${humanise(-elapsed)}`
  if (elapsed < 10) return 'just now'
  return `${humanise(elapsed)} ago`
}

/** Countdowns read forwards. "in 4m" is the answer to "when does this fire?". */
export function countdown(iso?: string | null): string {
  if (!iso) return '—'
  const remaining = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (remaining <= 0) return 'due now'
  return `in ${humanise(remaining)}`
}

function humanise(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

export function duration(ms?: number | null): string {
  if (ms === undefined || ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

/**
 * Lateness is signed and small numbers matter: "on time" is a real answer, and
 * 400ms late is not the same story as 40s late.
 */
export function lateness(ms?: number | null): string {
  if (ms === undefined || ms === null) return '—'
  if (ms < 1000) return 'on time'
  return `${duration(ms)} late`
}

export function percent(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  // Two decimals matter: 99.9 and 99.95 are very different promises.
  return `${value.toFixed(2)}%`
}

export function clockTime(iso?: string | null, timezone?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  })
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** The IANA zones offered in the editor, browser zone first so it is one click. */
export function timezoneOptions(): string[] {
  const common = [
    'UTC',
    'Africa/Nairobi',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ]
  const local = browserTimezone()
  return common.includes(local) ? common : [local, ...common]
}
