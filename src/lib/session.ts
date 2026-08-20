import { createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { log } from './logger'

export type Tenant = { uuid: string; name: string; slug: string; role: string }
export type SessionUser = { uuid: string; email: string; name: string }

const STORAGE_KEY = 'muiru-tick-session'

type StoredSession = {
  token: string
  user: SessionUser
  tenants: Tenant[]
  activeTenantUuid: string
}

function readStoredSession(): StoredSession | null {
  if (isServer) return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

const [session, setSessionSignal] = createSignal<StoredSession | null>(readStoredSession())

export { session }

export function startSession(token: string, user: SessionUser, tenants: Tenant[]) {
  const stored: StoredSession = { token, user, tenants, activeTenantUuid: tenants[0]?.uuid ?? '' }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  setSessionSignal(stored)
  log.auth.info('signed in', { user: user.email, tenants: tenants.length })
}

export function switchTenant(tenantUuid: string) {
  const current = session()
  if (!current) return
  const updated = { ...current, activeTenantUuid: tenantUuid }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  setSessionSignal(updated)
}

export function endSession() {
  localStorage.removeItem(STORAGE_KEY)
  setSessionSignal(null)
}

/**
 * Null on the server, where localStorage does not exist. Keying queries on the
 * tenant uuid rather than a boolean also means switching workspace refetches on
 * its own.
 */
export function activeTenantUuid(): string | null {
  if (isServer) return null
  return session()?.activeTenantUuid || null
}
