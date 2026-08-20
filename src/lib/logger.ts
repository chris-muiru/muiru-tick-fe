type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

// Warn and above in production: a scheduler dashboard left open on a wall
// display for a week should not grow an unbounded console.
const threshold = LEVEL_ORDER[import.meta.env.DEV ? 'debug' : 'warn']

const STYLE: Record<Level, string> = {
  debug: 'color:#8b93a7',
  info: 'color:#22b8cf',
  warn: 'color:#d99b2b',
  error: 'color:#e5484d',
}

function emit(module: string, level: Level, message: string, context?: unknown) {
  if (LEVEL_ORDER[level] < threshold) return
  const time = new Date().toTimeString().slice(0, 8)
  const method = level === 'debug' ? 'log' : level
  console[method](
    `%c${time} ${level.toUpperCase().padEnd(5)} %c[${module}]%c ${message}`,
    STYLE[level],
    'color:#a78bfa',
    'color:inherit',
    ...(context === undefined ? [] : [context]),
  )
}

function child(module: string) {
  return {
    debug: (message: string, context?: unknown) => emit(module, 'debug', message, context),
    info: (message: string, context?: unknown) => emit(module, 'info', message, context),
    warn: (message: string, context?: unknown) => emit(module, 'warn', message, context),
    error: (message: string, context?: unknown) => emit(module, 'error', message, context),
  }
}

export const log = {
  api: child('api'),
  auth: child('auth'),
  events: child('events'),
  ui: child('ui'),
}
