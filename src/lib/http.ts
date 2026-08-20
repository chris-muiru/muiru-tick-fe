import { session, endSession } from './session'
import { log } from './logger'

/**
 * Transport only. Endpoint knowledge lives in resource/<domain>/trans.ts and
 * query wiring in resource/<domain>/hook.ts — nothing here knows what a job is.
 */
const API_BASE = import.meta.env.VITE_TICK_API_BASE ?? 'http://localhost:6690/api/v1/tck'

export { API_BASE }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (authenticated) {
    const current = session()
    if (!current) throw new ApiError(401, 'unauthorized', 'not signed in')
    headers.set('Authorization', `Bearer ${current.token}`)
    headers.set('X-Tenant', current.activeTenantUuid)
  }

  const startedAt = performance.now()
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const ms = Math.round(performance.now() - startedAt)
  const method = init.method ?? 'GET'

  if (response.ok) {
    log.api.debug(`${method} ${path}`, { status: response.status, ms })
  } else {
    log.api.warn(`${method} ${path} failed`, { status: response.status, ms })
  }

  if (response.status === 401 && authenticated) {
    // An expired token and a revoked one want the same outcome: drop the
    // session rather than loop on retries.
    endSession()
    throw new ApiError(401, 'unauthorized', 'session expired')
  }
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ code: 'error', message: response.statusText }))
    throw new ApiError(response.status, body.code, body.message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Sign-in and sign-up run before a session exists. */
  anonymous: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, false),
}
