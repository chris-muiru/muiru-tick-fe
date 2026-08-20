import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js'
import { createStore, unwrap } from 'solid-js/store'
import { Card, CardBody, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Field } from '../ui/field'
import { Input, Textarea } from '../ui/input'
import { Select } from '../ui/select'
import { useZodForm } from '../../lib/useZodForm'
import { jobSchema } from '../../schemas/job'
import { CronBuilder, type ScheduleValue } from './CronBuilder'
import { SchedulePreview } from './SchedulePreview'
import { KeyValueEditor, type Pair } from './KeyValueEditor'
import { BodyEditor } from './BodyEditor'
import { useSchedulePreviewQuery } from '../../resource/job/hook'
import { usePoliciesQuery } from '../../resource/alert/hook'
import { browserTimezone } from '../../lib/format'
import type { Job } from '../../types'

export type JobFormValue = {
  name: string
  description: string
  schedule: ScheduleValue
  url: string
  method: string
  headers: Pair[]
  secretHeaders: Pair[]
  secretHeadersTouched: boolean
  body: string
  bodyContentType: string
  timeoutMs: number
  maxRedirects: number
  successStatusFrom: number
  successStatusTo: number
  successStatusExtra: string
  retryBackoff: string
  retryMaxAttempts: number
  retryBaseDelayMs: number
  retryMaxDelayMs: number
  retryOn: string[]
  concurrencyPolicy: string
  maxQueueDepth: number
  catchupPolicy: string
  catchupWindowSeconds: number
  catchupMaxOccurrences: number
  alertAfterFailures: number
  autoPauseAfter: number | null
  latenessBudgetMs: number | null
  escalationPolicyUuid: string
  webhookUrl: string
  webhookEvents: string[]
}

const METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((method) => ({
  value: method,
  label: method,
}))

const BACKOFFS = [
  {
    value: 'exponential',
    label: 'Exponential, jittered',
    hint: 'Doubles each time, with jitter so a hundred failing jobs do not retry in lockstep.',
  },
  { value: 'linear', label: 'Linear', hint: 'First delay × attempt number.' },
  { value: 'fixed', label: 'Fixed', hint: 'The same wait every time.' },
]

const OVERLAP_POLICIES = [
  { value: 'skip', label: 'Skip the new run', hint: 'Recorded as skipped, so you can see it happened.' },
  { value: 'queue', label: 'Queue it behind', hint: 'Up to the depth you set, then recorded as queue-full.' },
  { value: 'allow', label: 'Run both', hint: 'Only if your endpoint is safe to run in parallel.' },
]

const CATCHUP_POLICIES = [
  { value: 'run_latest', label: 'Run the most recent missed slot', hint: 'Usually what people mean.' },
  { value: 'skip', label: 'Run nothing, record the gap', hint: 'Every missed slot still appears in the history.' },
  { value: 'run_all', label: 'Run everything missed, paced', hint: 'Bounded by the window and count below.' },
]

const RETRY_RULES = [
  { value: 'timeout', label: 'Timeouts' },
  { value: 'connection_error', label: 'Connection errors' },
  { value: '5xx', label: 'Any 5xx' },
  { value: '429', label: '429 Too Many Requests' },
  { value: '408', label: '408 Request Timeout' },
  { value: '425', label: '425 Too Early' },
  { value: '4xx', label: 'Any 4xx (rarely what you want)' },
]

const WEBHOOK_EVENTS = [
  { value: 'on_failure', label: 'When a run finally fails' },
  { value: 'on_success', label: 'When a run succeeds' },
  { value: 'on_recovery', label: 'When a failing job recovers' },
]

export function emptyForm(): JobFormValue {
  return {
    name: '',
    description: '',
    schedule: { kind: 'cron', cronExpr: '0 9 * * 1-5', intervalSeconds: 300, timezone: browserTimezone() },
    url: '',
    method: 'POST',
    headers: [],
    secretHeaders: [],
    secretHeadersTouched: false,
    body: '',
    bodyContentType: 'application/json',
    timeoutMs: 30000,
    maxRedirects: 3,
    successStatusFrom: 200,
    successStatusTo: 299,
    successStatusExtra: '',
    retryBackoff: 'exponential',
    retryMaxAttempts: 3,
    retryBaseDelayMs: 30000,
    retryMaxDelayMs: 900000,
    retryOn: ['timeout', 'connection_error', '5xx', '408', '425', '429'],
    concurrencyPolicy: 'skip',
    maxQueueDepth: 5,
    catchupPolicy: 'run_latest',
    catchupWindowSeconds: 3600,
    catchupMaxOccurrences: 50,
    alertAfterFailures: 3,
    autoPauseAfter: null,
    latenessBudgetMs: null,
    escalationPolicyUuid: '',
    webhookUrl: '',
    webhookEvents: ['on_failure'],
  }
}

export function formFromJob(job: Job): JobFormValue {
  return {
    ...emptyForm(),
    name: job.name,
    description: job.description ?? '',
    schedule: {
      kind: job.schedule.kind,
      cronExpr: job.schedule.cronExpr ?? '0 9 * * 1-5',
      intervalSeconds: job.schedule.intervalSeconds ?? 300,
      timezone: job.schedule.timezone,
    },
    url: job.request.url,
    method: job.request.method,
    headers: Object.entries(job.request.headers ?? {}).map(([name, value]) => ({ name, value })),
    secretHeaders: Object.entries(job.request.secretHeaders ?? {}).map(([name, value]) => ({ name, value })),
    secretHeadersTouched: false,
    body: job.request.body ?? '',
    bodyContentType: job.request.bodyContentType,
    timeoutMs: job.request.timeoutMs,
    maxRedirects: job.request.maxRedirects,
    successStatusFrom: job.request.successStatusFrom,
    successStatusTo: job.request.successStatusTo,
    successStatusExtra: (job.request.successStatusExtra ?? []).join(', '),
    retryBackoff: job.retry.backoff,
    retryMaxAttempts: job.retry.maxAttempts,
    retryBaseDelayMs: job.retry.baseDelayMs,
    retryMaxDelayMs: job.retry.maxDelayMs,
    retryOn: job.retry.on,
    concurrencyPolicy: job.concurrency.policy,
    maxQueueDepth: job.concurrency.maxQueueDepth,
    catchupPolicy: job.catchup.policy,
    catchupWindowSeconds: job.catchup.windowSeconds,
    catchupMaxOccurrences: job.catchup.maxOccurrences,
    alertAfterFailures: job.alerting.afterFailures,
    autoPauseAfter: job.alerting.autoPauseAfter,
    latenessBudgetMs: job.alerting.latenessBudgetMs,
    escalationPolicyUuid: job.alerting.escalationPolicyUuid ?? '',
    webhookUrl: job.webhook.url ?? '',
    webhookEvents: job.webhook.events ?? [],
  }
}

/** Only fields the form actually carries are sent, so the API keeps its own defaults. */
export function toRequestBody(form: JobFormValue) {
  const body: Record<string, unknown> = {
    name: form.name,
    description: form.description || null,
    scheduleKind: form.schedule.kind,
    cronExpr: form.schedule.kind === 'cron' ? form.schedule.cronExpr : null,
    intervalSeconds: form.schedule.kind === 'interval' ? form.schedule.intervalSeconds : null,
    timezone: form.schedule.timezone,
    url: form.url,
    method: form.method,
    headers: Object.fromEntries(form.headers.filter((p) => p.name).map((p) => [p.name, p.value])),
    body: form.body || null,
    bodyContentType: form.bodyContentType,
    timeoutMs: form.timeoutMs,
    maxRedirects: form.maxRedirects,
    successStatusFrom: form.successStatusFrom,
    successStatusTo: form.successStatusTo,
    successStatusExtra: form.successStatusExtra
      .split(',')
      .map((code) => Number(code.trim()))
      .filter((code) => Number.isFinite(code) && code > 0),
    retryBackoff: form.retryBackoff,
    retryMaxAttempts: form.retryMaxAttempts,
    retryBaseDelayMs: form.retryBaseDelayMs,
    retryMaxDelayMs: form.retryMaxDelayMs,
    retryOn: form.retryOn,
    concurrencyPolicy: form.concurrencyPolicy,
    maxQueueDepth: form.maxQueueDepth,
    catchupPolicy: form.catchupPolicy,
    catchupWindowSeconds: form.catchupWindowSeconds,
    catchupMaxOccurrences: form.catchupMaxOccurrences,
    alertAfterFailures: form.alertAfterFailures,
    autoPauseAfter: form.autoPauseAfter,
    latenessBudgetMs: form.latenessBudgetMs,
    escalationPolicyUuid: form.escalationPolicyUuid || null,
    webhookUrl: form.webhookUrl || null,
    webhookEvents: form.webhookEvents,
  }
  // Untouched secret headers come back from the API masked. Sending them would
  // overwrite real tokens with rows of dots.
  if (form.secretHeadersTouched) {
    body.secretHeaders = Object.fromEntries(
      form.secretHeaders.filter((p) => p.name).map((p) => [p.name, p.value]),
    )
  }
  return body
}

export function JobForm(props: {
  initial: JobFormValue
  submitLabel: string
  saving?: boolean
  error?: string
  onSubmit: (form: JobFormValue) => void
  onCancel?: () => void
}) {
  const [form, setForm] = createStore(props.initial)
  const [debouncedSchedule, setDebouncedSchedule] = createSignal(props.initial.schedule)

  // The preview is a network call, so it trails the keystrokes rather than
  // racing them. 350ms is short enough that it still feels like typing.
  let timer: ReturnType<typeof setTimeout>
  const scheduleChanged = (next: ScheduleValue) => {
    setForm('schedule', next)
    clearTimeout(timer)
    timer = setTimeout(() => setDebouncedSchedule({ ...next }), 350)
  }
  onCleanup(() => clearTimeout(timer))

  const previewParams = createMemo(() => {
    const schedule = debouncedSchedule()
    if (schedule.kind === 'cron' && !schedule.cronExpr.trim()) return null
    return {
      kind: schedule.kind,
      cron: schedule.kind === 'cron' ? schedule.cronExpr : undefined,
      intervalSeconds: schedule.kind === 'interval' ? schedule.intervalSeconds : undefined,
      timezone: schedule.timezone,
    }
  })
  const preview = useSchedulePreviewQuery(previewParams)
  const policies = usePoliciesQuery()
  const validation = useZodForm(jobSchema)

  // The schema sees a flat projection of the form rather than the form itself:
  // the store holds editor state — the raw cron string, whether the secret
  // headers were touched — that has no business being validated.
  const schemaValues = () => ({
    name: form.name,
    url: form.url,
    timezone: form.schedule.timezone,
    intervalSeconds: form.schedule.intervalSeconds,
    timeoutMs: form.timeoutMs,
    maxRedirects: form.maxRedirects,
    successStatusFrom: form.successStatusFrom,
    successStatusTo: form.successStatusTo,
    retryMaxAttempts: form.retryMaxAttempts,
    retryBaseDelayMs: form.retryBaseDelayMs,
    retryMaxDelayMs: form.retryMaxDelayMs,
    maxQueueDepth: form.maxQueueDepth,
    catchupWindowSeconds: form.catchupWindowSeconds,
    catchupMaxOccurrences: form.catchupMaxOccurrences,
    alertAfterFailures: form.alertAfterFailures,
    autoPauseAfter: form.autoPauseAfter,
    latenessBudgetMs: form.latenessBudgetMs,
    webhookUrl: form.webhookUrl,
  })

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  return (
    <form
      class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(e) => {
        e.preventDefault()
        // Nothing is sent until every field the database would reject is fixed
        // here, where the message can say why.
        if (!validation.validateAll(schemaValues())) return
        props.onSubmit(unwrap(form))
      }}
    >
      <div class="min-w-0 space-y-5">
        <Card>
          <CardHeader title="Basics" />
          <CardBody class="space-y-3">
            <Field label="Name" error={validation.errors().name}>
              <Input
                placeholder="Nightly invoice reconciliation"
                value={form.name}
                aria-invalid={!!validation.errors().name}
                onInput={(e) => {
                  setForm('name', e.currentTarget.value)
                  validation.clearField('name')
                }}
                onBlur={() => validation.validateField('name', schemaValues())}
              />
            </Field>
            <Field label="Description" hint="Optional. Shown wherever this job is listed.">
              <Textarea
                rows={2}
                class="font-sans text-sm"
                value={form.description}
                onInput={(e) => setForm('description', e.currentTarget.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Schedule" />
          <CardBody>
            <CronBuilder value={form.schedule} onChange={scheduleChanged} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Request" />
          <CardBody class="space-y-4">
            <div class="flex gap-2">
              <Select
                class="w-28 shrink-0"
                value={form.method}
                options={METHODS}
                onChange={(method) => setForm('method', method)}
              />
              <Input
                class="num"
                placeholder="https://your-app.example.com/jobs/reconcile"
                value={form.url}
                spellcheck={false}
                aria-invalid={!!validation.errors().url}
                onInput={(e) => {
                  setForm('url', e.currentTarget.value)
                  validation.clearField('url')
                }}
                onBlur={() => validation.validateField('url', schemaValues())}
              />
            </div>
            <Show
              when={validation.errors().url}
              fallback={
                <p class="text-2xs text-muted">
                  Must be reachable from the public internet. Private and loopback
                  addresses are refused — we resolve the name first, so a hostname
                  pointing inward is blocked too.
                </p>
              }
            >
              <p class="text-2xs text-fail">{validation.errors().url}</p>
            </Show>

            <div>
              <span class="mb-1 block text-xs font-medium text-secondary">Headers</span>
              <KeyValueEditor pairs={form.headers} onChange={(pairs) => setForm('headers', pairs)} />
            </div>

            <div>
              <span class="mb-1 block text-xs font-medium text-secondary">Secret headers</span>
              <p class="mb-1.5 text-2xs text-muted">
                Encrypted at rest and never returned. Use this for Authorization.
              </p>
              <KeyValueEditor
                secret
                pairs={form.secretHeaders}
                namePlaceholder="Authorization"
                valuePlaceholder="Bearer …"
                onChange={(pairs) => {
                  setForm('secretHeaders', pairs)
                  setForm('secretHeadersTouched', true)
                }}
              />
            </div>

            <BodyEditor value={form.body} onChange={(value) => setForm('body', value)} />

            <div class="grid gap-3 sm:grid-cols-3">
              <Field label="Content type">
                <Input
                  class="num"
                  value={form.bodyContentType}
                  onInput={(e) => setForm('bodyContentType', e.currentTarget.value)}
                />
              </Field>
              <Field label="Timeout (seconds)" error={validation.errors().timeoutMs} hint="1–300. Covers connect, TLS and body.">
                <Input
                  type="number"
                  class="num"
                  min={1}
                  max={300}
                  value={Math.round(form.timeoutMs / 1000)}
                  onInput={(e) => setForm('timeoutMs', Number(e.currentTarget.value || 30) * 1000)}
                />
              </Field>
              <Field label="Max redirects">
                <Input
                  type="number"
                  class="num"
                  min={0}
                  max={10}
                  value={form.maxRedirects}
                  onInput={(e) => setForm('maxRedirects', Number(e.currentTarget.value || 0))}
                />
              </Field>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <Field label="Success from">
                <Input
                  type="number"
                  class="num"
                  value={form.successStatusFrom}
                  onInput={(e) => setForm('successStatusFrom', Number(e.currentTarget.value || 200))}
                />
              </Field>
              <Field label="Success to" error={validation.errors().successStatusTo}>
                <Input
                  type="number"
                  class="num"
                  value={form.successStatusTo}
                  onInput={(e) => setForm('successStatusTo', Number(e.currentTarget.value || 299))}
                />
              </Field>
              <Field label="Also treat as success" hint="Comma separated, e.g. 404, 409">
                <Input
                  class="num"
                  placeholder="404, 409"
                  value={form.successStatusExtra}
                  onInput={(e) => setForm('successStatusExtra', e.currentTarget.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="When things go wrong" />
          <CardBody class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <Field label="Backoff">
                <Select
                  value={form.retryBackoff}
                  options={BACKOFFS}
                  onChange={(value) => setForm('retryBackoff', value)}
                />
              </Field>
              <Field label="Max attempts" error={validation.errors().retryMaxAttempts} hint="Including the first. 1 means never retry.">
                <Input
                  type="number"
                  class="num"
                  min={1}
                  max={10}
                  value={form.retryMaxAttempts}
                  onInput={(e) => setForm('retryMaxAttempts', Number(e.currentTarget.value || 1))}
                />
              </Field>
              <Field label="First delay (seconds)">
                <Input
                  type="number"
                  class="num"
                  min={1}
                  value={Math.round(form.retryBaseDelayMs / 1000)}
                  onInput={(e) => setForm('retryBaseDelayMs', Number(e.currentTarget.value || 30) * 1000)}
                />
              </Field>
              <Field label="Longest delay (seconds)" error={validation.errors().retryMaxDelayMs}>
                <Input
                  type="number"
                  class="num"
                  min={1}
                  value={Math.round(form.retryMaxDelayMs / 1000)}
                  onInput={(e) => setForm('retryMaxDelayMs', Number(e.currentTarget.value || 900) * 1000)}
                />
              </Field>
            </div>

            <div>
              <span class="mb-1.5 block text-xs font-medium text-secondary">Retry on</span>
              <div class="flex flex-wrap gap-1.5">
                <For each={RETRY_RULES}>
                  {(rule) => (
                    <button
                      type="button"
                      aria-pressed={form.retryOn.includes(rule.value)}
                      onClick={() => setForm('retryOn', toggle(form.retryOn, rule.value))}
                      class={
                        form.retryOn.includes(rule.value)
                          ? 'rounded border border-accent bg-accent/10 px-2 py-1 text-2xs text-accent'
                          : 'rounded border border-border px-2 py-1 text-2xs text-secondary hover:bg-surface-2'
                      }
                    >
                      {rule.label}
                    </button>
                  )}
                </For>
              </div>
              <p class="mt-1.5 text-2xs text-muted">
                4xx is off by default. Retrying a 400 ten times produces ten guaranteed
                failures — 408, 425 and 429 are the exceptions, because those mean
                "later", not "never".
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <Field
                label="If the previous run is still going"
                hint="A skipped slot is still recorded, so you can see it happened."
              >
                <Select
                  value={form.concurrencyPolicy}
                  options={OVERLAP_POLICIES}
                  onChange={(value) => setForm('concurrencyPolicy', value)}
                />
              </Field>
              <Show when={form.concurrencyPolicy === 'queue'}>
                <Field label="Queue depth" hint="Past this, slots are recorded as queue-full.">
                  <Input
                    type="number"
                    class="num"
                    min={1}
                    max={100}
                    value={form.maxQueueDepth}
                    onInput={(e) => setForm('maxQueueDepth', Number(e.currentTarget.value || 5))}
                  />
                </Field>
              </Show>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <Field label="After downtime">
                <Select
                  value={form.catchupPolicy}
                  options={CATCHUP_POLICIES}
                  onChange={(value) => setForm('catchupPolicy', value)}
                />
              </Field>
              <Show when={form.catchupPolicy === 'run_all'}>
                <Field label="Catch-up window (hours)" hint="Older slots are recorded, not run.">
                  <Input
                    type="number"
                    class="num"
                    min={1}
                    max={24}
                    value={Math.round(form.catchupWindowSeconds / 3600)}
                    onInput={(e) =>
                      setForm('catchupWindowSeconds', Number(e.currentTarget.value || 1) * 3600)
                    }
                  />
                </Field>
              </Show>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Alerting" />
          <CardBody class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <Field label="Alert after consecutive failures" error={validation.errors().alertAfterFailures}>
                <Input
                  type="number"
                  class="num"
                  min={1}
                  max={50}
                  value={form.alertAfterFailures}
                  onInput={(e) => setForm('alertAfterFailures', Number(e.currentTarget.value || 3))}
                />
              </Field>
              <Field
                label="Escalation policy"
                hint="Without one, an incident opens but nobody is told."
              >
                <Select
                  value={form.escalationPolicyUuid}
                  options={[
                    { value: '', label: 'None', hint: 'An incident opens but nobody is told.' },
                    ...(policies.data ?? []).map((policy) => ({
                      value: policy.uuid,
                      label: policy.name,
                      hint: policy.steps.map((step) => step.channelName).join(' → '),
                    })),
                  ]}
                  onChange={(value) => setForm('escalationPolicyUuid', value)}
                />
              </Field>
              <Field
                label="Warn if a run starts late by (seconds)" error={validation.errors().latenessBudgetMs}
                hint="Leave blank to skip. This alerts on our punctuality, not your endpoint."
              >
                <Input
                  type="number"
                  class="num"
                  min={1}
                  placeholder="—"
                  value={form.latenessBudgetMs ? Math.round(form.latenessBudgetMs / 1000) : ''}
                  onInput={(e) =>
                    setForm(
                      'latenessBudgetMs',
                      e.currentTarget.value ? Number(e.currentTarget.value) * 1000 : null,
                    )
                  }
                />
              </Field>
              <Field
                label="Pause after consecutive failures" error={validation.errors().autoPauseAfter}
                hint="You are warned first and given 24 hours before anything is paused."
              >
                <Input
                  type="number"
                  class="num"
                  min={5}
                  placeholder="never"
                  value={form.autoPauseAfter ?? ''}
                  onInput={(e) =>
                    setForm('autoPauseAfter', e.currentTarget.value ? Number(e.currentTarget.value) : null)
                  }
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Completion webhook" />
          <CardBody class="space-y-3">
            <Field
              label="Callback URL"
              hint="Signed with this job's secret, using the same scheme as the scheduled call."
            >
              <Input
                class="num"
                placeholder="https://your-app.example.com/tick/callbacks"
                value={form.webhookUrl}
                spellcheck={false}
                onInput={(e) => setForm('webhookUrl', e.currentTarget.value)}
              />
            </Field>
            <Show when={form.webhookUrl}>
              <div class="flex flex-wrap gap-1.5">
                <For each={WEBHOOK_EVENTS}>
                  {(event) => (
                    <button
                      type="button"
                      aria-pressed={form.webhookEvents.includes(event.value)}
                      onClick={() => setForm('webhookEvents', toggle(form.webhookEvents, event.value))}
                      class={
                        form.webhookEvents.includes(event.value)
                          ? 'rounded border border-accent bg-accent/10 px-2 py-1 text-2xs text-accent'
                          : 'rounded border border-border px-2 py-1 text-2xs text-secondary hover:bg-surface-2'
                      }
                    >
                      {event.label}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </CardBody>
        </Card>
      </div>

      {/* Sticky on desktop: the preview is the thing being checked while every
          other field is edited, so it must never scroll out of view. */}
      <aside class="lg:sticky lg:top-16 lg:self-start">
        <SchedulePreview
          preview={preview.data}
          loading={preview.isPending}
          timezone={form.schedule.timezone}
        />

        <Show when={validation.firstError() ?? props.error}>
          {(message) => (
            <p class="mt-3 rounded border border-fail/30 bg-fail/10 px-2.5 py-2 text-xs text-fail">
              {message()}
            </p>
          )}
        </Show>

        <div class="mt-3 flex gap-2">
          <Button type="submit" loading={props.saving} class="flex-1">
            {props.submitLabel}
          </Button>
          <Show when={props.onCancel}>
            <Button type="button" variant="outline" onClick={() => props.onCancel!()}>
              Cancel
            </Button>
          </Show>
        </div>
      </aside>
    </form>
  )
}
