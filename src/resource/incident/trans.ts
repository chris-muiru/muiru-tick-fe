import { http } from '../../lib/http'
import type { Incident } from '../../types'

export const fetchIncidents = (state?: string) =>
  http.get<Incident[]>(`/incidents${state ? `?state=${state}` : ''}`)

export const acknowledgeIncident = (uuid: string) =>
  http.post<void>(`/incidents/${uuid}/acknowledge`)

export const resolveIncident = (uuid: string) => http.post<void>(`/incidents/${uuid}/resolve`)
