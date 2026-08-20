import { http } from '../../lib/http'
import type { Job, Run, SchedulePreview, SeriesPoint } from '../../types'

export const fetchJobs = () => http.get<Job[]>('/jobs')
export const fetchJob = (uuid: string) => http.get<Job>(`/jobs/${uuid}`)
export const createJob = (body: unknown) => http.post<Job>('/jobs', body)
export const updateJob = (uuid: string, body: unknown) => http.patch<Job>(`/jobs/${uuid}`, body)
export const deleteJob = (uuid: string) => http.del<void>(`/jobs/${uuid}`)
export const pauseJob = (uuid: string) => http.post<Job>(`/jobs/${uuid}/pause`)
export const resumeJob = (uuid: string) => http.post<Job>(`/jobs/${uuid}/resume`)
export const runJobNow = (uuid: string) => http.post<{ runUuid: string }>(`/jobs/${uuid}/run`)

export const fetchRuns = (uuid: string, before?: string, limit = 50) =>
  http.get<Run[]>(
    `/jobs/${uuid}/runs?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`,
  )

export const fetchSeries = (uuid: string, hours: number) =>
  http.get<SeriesPoint[]>(`/jobs/${uuid}/series?hours=${hours}`)

export const fetchChain = (occurrenceId: string) => http.get<Run[]>(`/runs/${occurrenceId}/chain`)

export const fetchSigningSecret = (uuid: string) =>
  http.get<{ signingSecret: string }>(`/jobs/${uuid}/signing-secret`)

export const rotateSigningSecret = (uuid: string) =>
  http.post<{ signingSecret: string }>(`/jobs/${uuid}/signing-secret`)

/**
 * The preview is computed by the server, by the same code the materialiser
 * calls. A client-side cron library would have its own view of DST and its own
 * idea of which fields are supported, and any disagreement means this screen
 * confidently shows times the scheduler will not honour.
 */
export const fetchSchedulePreview = (params: {
  kind: string
  cron?: string
  intervalSeconds?: number
  timezone: string
}) => {
  const query = new URLSearchParams({ kind: params.kind, timezone: params.timezone })
  if (params.cron) query.set('cron', params.cron)
  if (params.intervalSeconds) query.set('intervalSeconds', String(params.intervalSeconds))
  return http.get<SchedulePreview>(`/schedule/preview?${query}`)
}

export const fetchTemplateVariables = () => http.get<{ variables: string[] }>('/schedule/variables')
