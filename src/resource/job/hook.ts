import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'
import { activeTenantUuid } from '../../lib/session'
import { TICK_QUERY_NAMES, scopedKey } from '../queryKeys'
import {
  createJob,
  deleteJob,
  fetchChain,
  fetchJob,
  fetchJobs,
  fetchRuns,
  fetchSchedulePreview,
  fetchSeries,
  pauseJob,
  resumeJob,
  runJobNow,
  updateJob,
} from './trans'

export const useJobsQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.JOBS),
    queryFn: fetchJobs,
    enabled: !!activeTenantUuid(),
  }))

export const useJobQuery = (uuid: () => string) =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.JOB, uuid()),
    queryFn: () => fetchJob(uuid()),
    enabled: !!activeTenantUuid() && !!uuid(),
  }))

export const useRunsQuery = (uuid: () => string, limit = 50) =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.JOB_RUNS, uuid(), limit),
    queryFn: () => fetchRuns(uuid(), undefined, limit),
    enabled: !!activeTenantUuid() && !!uuid(),
  }))

export const useSeriesQuery = (uuid: () => string, hours: () => number) =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.JOB_SERIES, uuid(), hours()),
    queryFn: () => fetchSeries(uuid(), hours()),
    enabled: !!activeTenantUuid() && !!uuid(),
  }))

export const useChainQuery = (occurrenceId: () => string | null) =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.RUN_CHAIN, occurrenceId()),
    queryFn: () => fetchChain(occurrenceId()!),
    enabled: !!activeTenantUuid() && !!occurrenceId(),
  }))

/**
 * Debounced in the editor's own effect rather than here — this stays a plain
 * query so the preview is cached per expression and flicking between two cron
 * strings is instant the second time.
 */
export const useSchedulePreviewQuery = (params: () => {
  kind: string
  cron?: string
  intervalSeconds?: number
  timezone: string
} | null) =>
  useQuery(() => {
    const current = params()
    return {
      queryKey: [TICK_QUERY_NAMES.SCHEDULE_PREVIEW, current],
      queryFn: () => fetchSchedulePreview(current!),
      enabled: !!current,
      staleTime: 60_000,
    }
  })

export const useJobMutations = () => {
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: [activeTenantUuid()] })

  return {
    create: useMutation(() => ({ mutationFn: createJob, onSuccess: invalidate })),
    update: useMutation(() => ({
      mutationFn: (input: { uuid: string; body: unknown }) => updateJob(input.uuid, input.body),
      onSuccess: invalidate,
    })),
    remove: useMutation(() => ({ mutationFn: deleteJob, onSuccess: invalidate })),
    pause: useMutation(() => ({ mutationFn: pauseJob, onSuccess: invalidate })),
    resume: useMutation(() => ({ mutationFn: resumeJob, onSuccess: invalidate })),
    runNow: useMutation(() => ({ mutationFn: runJobNow, onSuccess: invalidate })),
  }
}
