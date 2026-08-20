/**
 * The builder's structured view of a cron expression.
 *
 * Cron is the storage format and the thing the engine evaluates; this is only a
 * lens over it. Every pattern round-trips to a string, and any expression the
 * lens cannot represent falls through to `custom` rather than being silently
 * rewritten into something close but different.
 */
export type Pattern =
  | { kind: 'everyMinutes'; minutes: number }
  | { kind: 'everyHours'; hours: number; minute: number }
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekdays'; hour: number; minute: number }
  | { kind: 'weekly'; days: number[]; hour: number; minute: number }
  | { kind: 'monthly'; day: number; hour: number; minute: number }
  | { kind: 'custom'; expr: string }

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function toCron(pattern: Pattern): string {
  switch (pattern.kind) {
    case 'everyMinutes':
      return `*/${pattern.minutes} * * * *`
    case 'everyHours':
      return `${pattern.minute} */${pattern.hours} * * *`
    case 'daily':
      return `${pattern.minute} ${pattern.hour} * * *`
    case 'weekdays':
      return `${pattern.minute} ${pattern.hour} * * 1-5`
    case 'weekly':
      return `${pattern.minute} ${pattern.hour} * * ${[...pattern.days].sort().join(',') || '0'}`
    case 'monthly':
      return `${pattern.minute} ${pattern.hour} ${pattern.day} * *`
    case 'custom':
      return pattern.expr
  }
}

export function fromCron(expr: string): Pattern {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return { kind: 'custom', expr }
  const [minute, hour, dom, month, dow] = fields
  if (month !== '*') return { kind: 'custom', expr }

  const minuteStep = step(minute)
  if (minuteStep && hour === '*' && dom === '*' && dow === '*') {
    return { kind: 'everyMinutes', minutes: minuteStep }
  }

  const hourStep = step(hour)
  const minuteValue = number(minute)
  if (hourStep && minuteValue !== null && dom === '*' && dow === '*') {
    return { kind: 'everyHours', hours: hourStep, minute: minuteValue }
  }

  const hourValue = number(hour)
  if (minuteValue === null || hourValue === null) return { kind: 'custom', expr }

  if (dom === '*' && dow === '*') return { kind: 'daily', hour: hourValue, minute: minuteValue }
  if (dom === '*' && dow === '1-5') return { kind: 'weekdays', hour: hourValue, minute: minuteValue }
  if (dom === '*') {
    const days = list(dow)
    if (days) return { kind: 'weekly', days, hour: hourValue, minute: minuteValue }
  }
  if (dow === '*') {
    const day = number(dom)
    if (day !== null) return { kind: 'monthly', day, hour: hourValue, minute: minuteValue }
  }
  return { kind: 'custom', expr }
}

function step(field: string): number | null {
  const match = /^\*\/(\d+)$/.exec(field)
  return match ? Number(match[1]) : null
}

function number(field: string): number | null {
  return /^\d+$/.test(field) ? Number(field) : null
}

function list(field: string): number[] | null {
  if (!/^\d+(,\d+)*$/.test(field)) return null
  return field.split(',').map(Number)
}

/** The schedules people actually ask for, one click away. */
export const PRESETS: { label: string; expr: string }[] = [
  { label: 'Every 5 minutes', expr: '*/5 * * * *' },
  { label: 'Every 15 minutes', expr: '*/15 * * * *' },
  { label: 'Hourly', expr: '0 * * * *' },
  { label: 'Every weekday 09:00', expr: '0 9 * * 1-5' },
  { label: 'Daily midnight', expr: '0 0 * * *' },
  { label: 'Monday 08:00', expr: '0 8 * * 1' },
  { label: 'First of month', expr: '0 0 1 * *' },
]
