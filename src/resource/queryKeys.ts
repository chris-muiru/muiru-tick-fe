import { activeTenantUuid } from '../lib/session'

export enum TICK_QUERY_NAMES {
  OVERVIEW = 'overview',
  JOBS = 'jobs',
  JOB = 'job',
  JOB_RUNS = 'jobRuns',
  JOB_SERIES = 'jobSeries',
  RUN_CHAIN = 'runChain',
  SCHEDULE_PREVIEW = 'schedulePreview',
  INCIDENTS = 'incidents',
  ALERT_CHANNELS = 'alertChannels',
  ESCALATION_POLICIES = 'escalationPolicies',
  DELIVERIES = 'deliveries',
  WEBHOOK_DELIVERIES = 'webhookDeliveries',
  TEAM = 'team',
  CREDENTIALS = 'credentials',
}

/**
 * Every key is prefixed with the active tenant, so switching workspace refetches
 * instead of showing another workspace's cached numbers — and one invalidate on
 * that prefix clears everything the current workspace has cached.
 */
export const scopedKey = (...parts: unknown[]) => [activeTenantUuid(), ...parts]
