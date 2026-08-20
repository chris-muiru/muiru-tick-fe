export type Outcome =
  | 'success'
  | 'failure'
  | 'timeout'
  | 'connection_error'
  | 'lost'
  | 'skipped_overlap'
  | 'skipped_queue_full'
  | 'skipped_catchup'
  | 'catchup_window_exceeded'
  | 'dst_nonexistent_time'
  | 'expired'
  | 'blocked'

export type RunState = 'pending' | 'running' | 'done' | 'skipped'
export type Trigger = 'schedule' | 'retry' | 'manual' | 'catchup' | 'queued'

export type Schedule = {
  kind: 'cron' | 'interval'
  cronExpr: string | null
  intervalSeconds: number | null
  timezone: string
  human: string
  nextRunAt: string | null
}

export type JobRequest = {
  url: string
  method: string
  headers: Record<string, string>
  secretHeaders: Record<string, string>
  body: string | null
  bodyContentType: string
  timeoutMs: number
  maxRedirects: number
  successStatusFrom: number
  successStatusTo: number
  successStatusExtra: number[]
}

export type Retry = {
  backoff: 'fixed' | 'linear' | 'exponential'
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  on: string[]
}

export type Concurrency = { policy: 'skip' | 'queue' | 'allow'; maxQueueDepth: number }

export type Catchup = {
  policy: 'skip' | 'run_latest' | 'run_all'
  windowSeconds: number
  maxOccurrences: number
  truncatedAt: string | null
}

export type Alerting = {
  afterFailures: number
  autoPauseAfter: number | null
  latenessBudgetMs: number | null
  escalationPolicyUuid: string | null
}

export type Webhook = { url: string | null; events: string[] }

export type Job = {
  uuid: string
  name: string
  description: string | null
  enabled: boolean
  statusReason: string | null
  schedule: Schedule
  request: JobRequest
  retry: Retry
  concurrency: Concurrency
  catchup: Catchup
  alerting: Alerting
  webhook: Webhook
  last: {
    runAt: string | null
    outcome: Outcome | null
    statusCode: number | null
    durationMs: number | null
  }
  consecutiveFailures: number
  runs7d: number
  successRate7d: number | null
  /** Last twenty runs, oldest first, for the strip on the job list. */
  recentOutcomes: string[]
  createdAt: string
  updatedAt: string
}

export type Run = {
  uuid: string
  occurrenceId: string
  attempt: number
  trigger: Trigger
  state: RunState
  outcome: Outcome | null
  scheduledFor: string
  startedAt: string | null
  finishedAt: string | null
  latenessMs: number | null
  durationMs: number | null
  statusCode: number | null
  error: string | null
  responseSnippet: string | null
  webhookState: string
}

export type SeriesPoint = {
  at: string
  durationMs: number
  latenessMs: number
  success: boolean
}

export type SchedulePreview = {
  valid: boolean
  error?: string
  human?: string
  runs: string[]
  notes?: string[]
}

export type Incident = {
  uuid: string
  jobUuid: string
  jobName: string
  kind: 'failing' | 'late'
  state: 'open' | 'acknowledged' | 'resolved'
  cause: string
  startedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  escalating: boolean
}

export type TimelineRun = {
  runUuid: string
  occurrenceId: string
  jobUuid: string
  jobName: string
  scheduledFor: string
  startedAt: string | null
  state: RunState
  outcome: Outcome | null
  durationMs: number | null
  latenessMs: number | null
}

export type TimelineSlot = { jobUuid: string; jobName: string; at: string }

export type Overview = {
  timeline: {
    from: string
    now: string
    to: string
    past: TimelineRun[]
    future: TimelineSlot[]
  }
  totals: {
    jobs: number
    paused: number
    running: number
    queued: number
    runs24h: number
    failures24h: number
    successRate24h: number | null
    latencyP50Ms?: number | null
    latenessP50Ms: number | null
    latenessP95Ms: number | null
    openIncidents: number
  }
  running: {
    runUuid: string
    jobUuid: string
    jobName: string
    attempt: number
    startedAt: string
    scheduledFor: string
    timeoutMs: number
  }[]
  upcoming: { jobUuid: string; jobName: string; human: string; nextRunAt: string }[]
  failures: {
    runUuid: string
    occurrenceId: string
    jobUuid: string
    jobName: string
    attempt: number
    outcome: Outcome
    statusCode: number | null
    error: string | null
    finishedAt: string
  }[]
}

export type AlertChannel = {
  uuid: string
  name: string
  kind: 'email' | 'sms' | 'webhook' | 'slack'
  target: string
  template: string
  enabled: boolean
}

export type EscalationPolicy = {
  uuid: string
  name: string
  steps: {
    channelUuid: string
    channelName: string
    channelKind: string
    waitSeconds: number
    position: number
  }[]
}

export type Delivery = {
  uuid: string
  channelKind: string
  channelName: string
  target: string
  jobName: string
  status: 'sent' | 'failed'
  attempt: number
  durationMs: number | null
  error: string | null
  attemptedAt: string
}

export type WebhookDelivery = {
  uuid: string
  runUuid: string
  url: string
  event: string
  status: 'sent' | 'failed'
  statusCode: number | null
  attempt: number
  durationMs: number | null
  error: string | null
  attemptedAt: string
}

export type TeamMember = {
  uuid: string
  email: string
  name: string
  role: string
  accepted: boolean
}

export type ApiCredential = {
  uuid: string
  name: string
  clientKey: string
  revoked: boolean
}
