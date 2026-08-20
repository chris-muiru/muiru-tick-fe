import { http } from '../../lib/http'
import type { AlertChannel, Delivery, EscalationPolicy, WebhookDelivery } from '../../types'

export const fetchChannels = () => http.get<AlertChannel[]>('/alert-channels')
export const createChannel = (body: unknown) => http.post<{ uuid: string }>('/alert-channels', body)
export const updateChannel = (uuid: string, body: unknown) =>
  http.patch<void>(`/alert-channels/${uuid}`, body)
export const deleteChannel = (uuid: string) => http.del<void>(`/alert-channels/${uuid}`)
export const testChannel = (uuid: string) => http.post<void>(`/alert-channels/${uuid}/test`)

export const fetchPolicies = () => http.get<EscalationPolicy[]>('/escalation-policies')
export const createPolicy = (body: unknown) =>
  http.post<{ uuid: string }>('/escalation-policies', body)
export const deletePolicy = (uuid: string) => http.del<void>(`/escalation-policies/${uuid}`)

export const fetchDeliveries = () => http.get<Delivery[]>('/deliveries')
export const fetchWebhookDeliveries = () => http.get<WebhookDelivery[]>('/webhook-deliveries')
