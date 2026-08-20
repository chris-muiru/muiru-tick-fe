import { http } from '../../lib/http'
import type { ApiCredential, SessionUser, Tenant, TeamMember } from '../../types/account'

export const login = (email: string, password: string) =>
  http.anonymous<{ token: string; user: SessionUser; tenants: Tenant[] }>('/auth/login', {
    email,
    password,
  })

export const signup = (body: Record<string, string>) =>
  http.anonymous<{ token: string; user: SessionUser; tenants: Tenant[] }>('/auth/signup', body)

export const acceptInvite = (token: string, body: Record<string, string>) =>
  http.anonymous<{ token: string; user: SessionUser; tenants: Tenant[] }>(
    `/auth/invites/${token}/accept`,
    body,
  )

export const fetchTeam = () => http.get<TeamMember[]>('/team')
export const inviteTeammate = (email: string, role: string) =>
  http.post<{ emailSent: boolean; inviteToken?: string }>('/team/invites', { email, role })

export const fetchCredentials = () => http.get<ApiCredential[]>('/credentials')
export const createCredential = (name: string) =>
  http.post<{ uuid: string; clientKey: string; clientSecret: string }>('/credentials', { name })
export const revokeCredential = (uuid: string) => http.patch<void>(`/credentials/${uuid}/revoke`, {})
export const deleteCredential = (uuid: string) => http.del<void>(`/credentials/${uuid}`)
