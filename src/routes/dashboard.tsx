import { A } from '@solidjs/router'
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { OutcomeBadge } from '../components/shared/Outcome'
import { Timeline } from '../components/dashboard/Timeline'
import { Skeleton } from '../components/ui/skeleton'
import { useOverviewQuery } from '../resource/overview/hook'
import { clockTime, countdown, duration, percent, relativeTime } from '../lib/format'
import { cn } from '../lib/utils'

export default function Dashboard() {
  const overview = useOverviewQuery()
  const [now, setNow] = createSignal(Date.now())
  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const totals = () => overview.data?.totals

  return (
    <Shell>
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h1 class="text-lg font-medium tracking-tight text-primary">Overview</h1>
        <A
          href="/jobs/new"
          class="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
        >
          New job
        </A>
      </div>

      <Timeline data={overview.data?.timeline} loading={overview.isPending} />

      {/* Numbers as a hairline-separated strip, not a row of boxes. The
          timeline above is the thing being read; these are its footnotes. */}
      <div class="my-4 grid grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="Jobs"
          value={String(totals()?.jobs ?? 0)}
          note={totals()?.paused ? `${totals()!.paused} paused` : 'all active'}
          loading={overview.isPending}
        />
        <Stat
          label="Success, 24h"
          value={percent(totals()?.successRate24h)}
          note={`${totals()?.runs24h ?? 0} runs`}
          tone={(totals()?.successRate24h ?? 100) < 99 ? 'fail' : 'ok'}
          loading={overview.isPending}
        />
        <Stat
          label="Lateness p95"
          value={duration(totals()?.latenessP95Ms)}
          note={`median ${duration(totals()?.latenessP50Ms)}`}
          tone={(totals()?.latenessP95Ms ?? 0) > 30_000 ? 'late' : 'ok'}
          loading={overview.isPending}
        />
        <Stat
          label="In flight"
          value={String(totals()?.running ?? 0)}
          note={totals()?.queued ? `${totals()!.queued} queued` : 'nothing queued'}
          loading={overview.isPending}
        />
        <Stat
          label="Open incidents"
          value={String(totals()?.openIncidents ?? 0)}
          tone={totals()?.openIncidents ? 'fail' : 'ok'}
          loading={overview.isPending}
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <Panel title="Running now">
          <Show when={!overview.isPending} fallback={<Skeleton class="m-3 h-14" />}>
            <Show
              when={(overview.data?.running.length ?? 0) > 0}
              fallback={<Empty>Nothing is in flight. That is the normal state.</Empty>}
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.running}>
                  {(run) => {
                    const elapsed = () => now() - new Date(run.startedAt).getTime()
                    const fraction = () => Math.min(1, elapsed() / run.timeoutMs)
                    return (
                      <div class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          <span class="relative inline-flex h-1.5 w-1.5 shrink-0">
                            <span class="absolute inline-flex h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
                            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                          </span>
                          <A
                            href={`/jobs/${run.jobUuid}`}
                            class="truncate text-xs text-primary hover:text-accent"
                          >
                            {run.jobName}
                          </A>
                          <Show when={run.attempt > 1}>
                            <span class="num text-2xs text-late">try {run.attempt}</span>
                          </Show>
                          <span class="num ml-auto shrink-0 text-2xs text-secondary">
                            {duration(elapsed())}
                          </span>
                        </div>
                        {/* Filling toward this job's own timeout, so a run about
                            to be cut off looks like one. */}
                        <div class="mt-1.5 h-0.5 overflow-hidden rounded-full bg-surface-2">
                          <div
                            class={cn(
                              'h-full rounded-full',
                              fraction() > 0.8 ? 'bg-fail' : 'bg-accent',
                            )}
                            style={{ width: `${fraction() * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  }}
                </For>
              </div>
            </Show>
          </Show>
        </Panel>

        <Panel title="Next up">
          <Show when={!overview.isPending} fallback={<Skeleton class="m-3 h-14" />}>
            <Show
              when={(overview.data?.upcoming.length ?? 0) > 0}
              fallback={
                <Empty>
                  No active jobs.{' '}
                  <A href="/jobs/new" class="text-accent hover:underline">
                    Create one
                  </A>
                  .
                </Empty>
              }
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.upcoming.slice(0, 6)}>
                  {(item) => (
                    <div class="flex items-center gap-2 px-3 py-2">
                      <A
                        href={`/jobs/${item.jobUuid}`}
                        class="min-w-0 flex-1 truncate text-xs text-primary hover:text-accent"
                      >
                        {item.jobName}
                      </A>
                      <span class="num shrink-0 text-2xs text-secondary" title={clockTime(item.nextRunAt)}>
                        {now() ? countdown(item.nextRunAt) : ''}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Panel>

        <Panel title="Needs attention">
          <Show when={!overview.isPending} fallback={<Skeleton class="m-3 h-14" />}>
            <Show
              when={(overview.data?.failures.length ?? 0) > 0}
              fallback={<Empty>Nothing has failed recently.</Empty>}
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.failures.slice(0, 8)}>
                  {(failure) => (
                    <A
                      href={`/jobs/${failure.jobUuid}`}
                      class="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span class="shrink-0 pt-0.5">
                        <OutcomeBadge state="done" outcome={failure.outcome} />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-xs text-primary">{failure.jobName}</span>
                        <span class="break-anywhere block text-2xs text-muted">
                          {failure.error ?? `HTTP ${failure.statusCode ?? '—'}`}
                        </span>
                      </span>
                      <span class="num shrink-0 text-2xs text-muted">
                        {relativeTime(failure.finishedAt)}
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Panel>
      </div>
    </Shell>
  )
}

function Stat(props: {
  label: string
  value: string
  note?: string
  tone?: 'ok' | 'fail' | 'late'
  loading?: boolean
}) {
  const toneClass = () =>
    ({ ok: 'text-primary', fail: 'text-fail', late: 'text-late' })[props.tone ?? 'ok']
  return (
    <div class="px-3 py-2">
      <p class="truncate text-2xs uppercase tracking-wide text-muted">{props.label}</p>
      <Show when={!props.loading} fallback={<Skeleton class="mt-1 h-5 w-16" />}>
        <p class={cn('num mt-0.5 text-lg font-medium tabular-nums', toneClass())}>{props.value}</p>
      </Show>
      <Show when={props.note}>
        <p class="truncate text-2xs text-muted">{props.note}</p>
      </Show>
    </div>
  )
}

function Panel(props: { title: string; children: unknown }) {
  return (
    <section class="min-w-0 rounded border border-border bg-surface-1">
      <header class="flex h-9 items-center border-b border-border px-3">
        <h2 class="text-2xs font-medium uppercase tracking-wide text-muted">{props.title}</h2>
      </header>
      {props.children as never}
    </section>
  )
}

function Empty(props: { children: unknown }) {
  return <p class="px-3 py-8 text-center text-xs text-muted">{props.children as never}</p>
}
