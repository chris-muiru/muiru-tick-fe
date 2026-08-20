import { A, useNavigate, useParams } from '@solidjs/router'
import { For, Show, createSignal } from 'solid-js'
import { Shell } from '../../../components/shared/Shell'
import { SectionsSkeleton } from '../../../components/shared/PageSkeleton'
import { RunTable } from '../../../components/run/RunTable'
import { RunChart } from '../../../components/run/RunChart'
import { SecretValue } from '../../../components/shared/SecretValue'
import { Card, CardBody, CardHeader } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { useJobMutations, useJobQuery, useRunsQuery, useSeriesQuery } from '../../../resource/job/hook'
import { fetchSigningSecret, rotateSigningSecret } from '../../../resource/job/trans'
import { clockTime, countdown, duration, percent, relativeTime } from '../../../lib/format'

export default function JobDetail() {
  const params = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const job = useJobQuery(() => params.uuid)
  const runs = useRunsQuery(() => params.uuid, 100)
  const [hours, setHours] = createSignal(24)
  const series = useSeriesQuery(() => params.uuid, hours)
  const mutations = useJobMutations()
  const [secret, setSecret] = createSignal('')
  const [ranNow, setRanNow] = createSignal(false)

  return (
    <Shell>
      <Show when={job.data} fallback={<SectionsSkeleton />}>
        {(loaded) => (
          <>
            <div class="mb-4 flex flex-wrap items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="truncate text-xl font-medium tracking-tight text-primary">
                    {loaded().name}
                  </h1>
                  <Show when={!loaded().enabled}>
                    <Badge variant="neutral">Paused</Badge>
                  </Show>
                  <Show when={loaded().consecutiveFailures > 0}>
                    <Badge variant="fail">{loaded().consecutiveFailures} consecutive failures</Badge>
                  </Show>
                </div>
                <p class="mt-0.5 text-xs text-secondary">{loaded().schedule.human}</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={mutations.runNow.isPending}
                  onClick={() =>
                    mutations.runNow.mutate(params.uuid, { onSuccess: () => setRanNow(true) })
                  }
                >
                  Run now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    loaded().enabled
                      ? mutations.pause.mutate(params.uuid)
                      : mutations.resume.mutate(params.uuid)
                  }
                >
                  {loaded().enabled ? 'Pause' : 'Resume'}
                </Button>
                <A
                  href={`/jobs/${params.uuid}/edit`}
                  class="inline-flex h-7 items-center rounded bg-accent px-2.5 text-xs font-medium text-accent-fg"
                >
                  Edit
                </A>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete ${loaded().name}? Its run history goes with it.`)) return
                    mutations.remove.mutate(params.uuid, { onSuccess: () => navigate('/jobs') })
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>

            <Show when={ranNow()}>
              <p class="mb-4 rounded border border-accent/30 bg-accent/10 px-2.5 py-2 text-xs text-primary">
                Queued. It appears in the run history below as soon as a worker picks it up —
                a manual run gets its own idempotency key, so your endpoint can tell it apart
                from the scheduled one.
              </p>
            </Show>

            <Show when={loaded().statusReason}>
              <p class="mb-4 rounded border border-late/30 bg-late/10 px-2.5 py-2 text-xs text-primary">
                {loaded().statusReason}
              </p>
            </Show>

            <Show when={loaded().catchup.truncatedAt}>
              <p class="mb-4 rounded border border-skipped/30 bg-skipped/10 px-2.5 py-2 text-xs text-primary">
                Some occurrences were not run because they fell outside this job's catch-up
                window. They are in the history below, marked as skipped, so the gap is
                accounted for rather than mysterious.
              </p>
            </Show>

            <div class="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div class="min-w-0 space-y-5">
                <Card>
                  <CardHeader
                    title="Duration and lateness"
                    action={
                      <div class="flex gap-1">
                        <For each={[6, 24, 168]}>
                          {(option) => (
                            <button
                              type="button"
                              onClick={() => setHours(option)}
                              class={
                                hours() === option
                                  ? 'rounded bg-accent/10 px-1.5 py-0.5 text-2xs text-accent'
                                  : 'rounded px-1.5 py-0.5 text-2xs text-muted hover:text-primary'
                              }
                            >
                              {option === 168 ? '7d' : `${option}h`}
                            </button>
                          )}
                        </For>
                      </div>
                    }
                  />
                  <RunChart points={series.data ?? []} />
                </Card>

                <Card>
                  <CardHeader
                    title="Run history"
                    action={<span class="text-2xs text-muted">click a row for the attempt chain</span>}
                  />
                  <RunTable
                    runs={runs.data}
                    loading={runs.isPending}
                    timezone={loaded().schedule.timezone}
                  />
                </Card>
              </div>

              <aside class="space-y-5">
                <Card>
                  <CardHeader title="At a glance" />
                  <CardBody class="space-y-2 text-xs">
                    <Row label="Next run">
                      <Show when={loaded().enabled} fallback={<span class="text-muted">paused</span>}>
                        <span class="num text-primary">{countdown(loaded().schedule.nextRunAt)}</span>
                        <span class="num block text-2xs text-muted">
                          {clockTime(loaded().schedule.nextRunAt, loaded().schedule.timezone)}
                        </span>
                      </Show>
                    </Row>
                    <Row label="Last run">
                      <span class="text-primary">{relativeTime(loaded().last.runAt)}</span>
                      <span class="num block text-2xs text-muted">
                        {loaded().last.statusCode ? `HTTP ${loaded().last.statusCode}` : '—'} ·{' '}
                        {duration(loaded().last.durationMs)}
                      </span>
                    </Row>
                    <Row label="Success, 7 days">
                      <span class="num text-primary">{percent(loaded().successRate7d)}</span>
                      <span class="num block text-2xs text-muted">{loaded().runs7d} runs</span>
                    </Row>
                    <Row label="Timezone">
                      <span class="num text-primary">{loaded().schedule.timezone}</span>
                    </Row>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Configuration" />
                  <CardBody class="space-y-2 text-xs">
                    <Row label="Target">
                      <span class="num break-anywhere text-primary">
                        {loaded().request.method} {loaded().request.url}
                      </span>
                    </Row>
                    <Row label="Timeout">
                      <span class="num text-primary">{duration(loaded().request.timeoutMs)}</span>
                    </Row>
                    <Row label="Success">
                      <span class="num text-primary">
                        {loaded().request.successStatusFrom}–{loaded().request.successStatusTo}
                        {loaded().request.successStatusExtra.length
                          ? `, ${loaded().request.successStatusExtra.join(', ')}`
                          : ''}
                      </span>
                    </Row>
                    <Row label="Retry">
                      <span class="text-primary">
                        up to {loaded().retry.maxAttempts} attempts, {loaded().retry.backoff}
                      </span>
                    </Row>
                    <Row label="If still running">
                      <span class="text-primary">{OVERLAP[loaded().concurrency.policy]}</span>
                    </Row>
                    <Row label="After downtime">
                      <span class="text-primary">{CATCHUP[loaded().catchup.policy]}</span>
                    </Row>
                    <Show when={Object.keys(loaded().request.secretHeaders).length}>
                      <Row label="Secret headers">
                        <span class="num text-primary">
                          {Object.keys(loaded().request.secretHeaders).join(', ')}
                        </span>
                      </Row>
                    </Show>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Signing secret" />
                  <CardBody class="space-y-2">
                    <p class="text-2xs text-muted">
                      Verify <span class="num">X-Tick-Signature</span> with this so your endpoint
                      can tell our call from anyone else's.
                    </p>
                    <Show
                      when={secret()}
                      fallback={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => setSecret((await fetchSigningSecret(params.uuid)).signingSecret)}
                        >
                          Show secret
                        </Button>
                      }
                    >
                      <SecretValue value={secret()} />
                      <button
                        type="button"
                        class="text-2xs text-muted hover:text-fail"
                        onClick={async () => {
                          if (!confirm('Rotate? Existing verification code stops matching immediately.')) return
                          setSecret((await rotateSigningSecret(params.uuid)).signingSecret)
                        }}
                      >
                        Rotate
                      </button>
                    </Show>
                  </CardBody>
                </Card>
              </aside>
            </div>
          </>
        )}
      </Show>
    </Shell>
  )
}

const OVERLAP: Record<string, string> = {
  skip: 'skip the new run',
  queue: 'queue it behind',
  allow: 'run both',
}

const CATCHUP: Record<string, string> = {
  run_latest: 'run the most recent missed slot',
  skip: 'run nothing, record the gap',
  run_all: 'run everything missed, paced',
}

function Row(props: { label: string; children: unknown }) {
  return (
    <div class="flex items-start justify-between gap-3">
      <span class="shrink-0 text-muted">{props.label}</span>
      <span class="min-w-0 text-right">{props.children as never}</span>
    </div>
  )
}
