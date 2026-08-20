import { A } from '@solidjs/router'
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { StatTile } from '../components/shared/StatTile'
import { OutcomeBadge } from '../components/shared/Outcome'
import { Card, CardHeader } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { useOverviewQuery } from '../resource/overview/hook'
import { clockTime, countdown, duration, lateness, percent, relativeTime } from '../lib/format'
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
      <div class="mb-4 flex items-baseline justify-between gap-3">
        <h1 class="text-xl font-medium tracking-tight text-primary">Overview</h1>
        <A href="/jobs/new" class="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg">
          New job
        </A>
      </div>

      <div class="mb-5 grid grid-cols-2 rounded-lg border border-border bg-surface-1 px-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Jobs"
          value={String(totals()?.jobs ?? 0)}
          loading={overview.isPending}
          hint={totals()?.paused ? `${totals()!.paused} paused` : 'all active'}
        />
        <StatTile
          label="Success, 24h"
          value={percent(totals()?.successRate24h)}
          tone={(totals()?.successRate24h ?? 100) < 99 ? 'fail' : 'ok'}
          loading={overview.isPending}
          hint={`${totals()?.runs24h ?? 0} runs`}
        />
        {/* Our own punctuality, on the front page. Nobody else in this category
            publishes it, because it is the number that indicts the scheduler
            rather than the endpoint. */}
        <StatTile
          label="Lateness p95"
          value={duration(totals()?.latenessP95Ms)}
          tone={(totals()?.latenessP95Ms ?? 0) > 30_000 ? 'late' : 'ok'}
          loading={overview.isPending}
          hint={`median ${duration(totals()?.latenessP50Ms)}`}
        />
        <StatTile
          label="Running"
          value={String(totals()?.running ?? 0)}
          loading={overview.isPending}
          hint={totals()?.queued ? `${totals()!.queued} queued` : 'nothing queued'}
        />
        <StatTile
          label="Open incidents"
          value={String(totals()?.openIncidents ?? 0)}
          tone={totals()?.openIncidents ? 'fail' : 'ok'}
          loading={overview.isPending}
        />
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Running now" />
          <Show
            when={!overview.isPending}
            fallback={<Skeleton class="m-3.5 h-16" />}
          >
            <Show
              when={(overview.data?.running.length ?? 0) > 0}
              fallback={
                <p class="px-5 py-8 text-center text-xs text-muted">
                  Nothing is in flight. That is the normal state.
                </p>
              }
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.running}>
                  {(run) => {
                    const elapsed = () => now() - new Date(run.startedAt).getTime()
                    const fraction = () => Math.min(1, elapsed() / run.timeoutMs)
                    return (
                      <div class="px-3.5 py-2.5">
                        <div class="flex items-center gap-2">
                          <span class="relative inline-flex h-2 w-2 shrink-0">
                            <span class="absolute inline-flex h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
                            <span class="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                          </span>
                          <A
                            href={`/jobs/${run.jobUuid}`}
                            class="truncate text-sm text-primary hover:text-accent"
                          >
                            {run.jobName}
                          </A>
                          <Show when={run.attempt > 1}>
                            <span class="num text-2xs text-late">attempt {run.attempt}</span>
                          </Show>
                          <span class="num ml-auto shrink-0 text-xs text-secondary">
                            {duration(elapsed())}
                          </span>
                        </div>
                        {/* Filling toward the job's own timeout, so a run about
                            to be cut off looks like one. */}
                        <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            class={cn(
                              'h-full rounded-full transition-[width]',
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
        </Card>

        <Card>
          <CardHeader title="Next scheduled" />
          <Show when={!overview.isPending} fallback={<Skeleton class="m-3.5 h-16" />}>
            <Show
              when={(overview.data?.upcoming.length ?? 0) > 0}
              fallback={
                <p class="px-5 py-8 text-center text-xs text-muted">
                  No active jobs. <A href="/jobs/new" class="text-accent hover:underline">Create one</A>.
                </p>
              }
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.upcoming}>
                  {(item) => (
                    <div class="flex items-center gap-3 px-3.5 py-2.5">
                      <div class="min-w-0 flex-1">
                        <A
                          href={`/jobs/${item.jobUuid}`}
                          class="block truncate text-sm text-primary hover:text-accent"
                        >
                          {item.jobName}
                        </A>
                        <p class="truncate text-2xs text-muted">{item.human}</p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p class="num text-xs text-primary">{now() ? countdown(item.nextRunAt) : ''}</p>
                        <p class="num text-2xs text-muted">{clockTime(item.nextRunAt)}</p>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Card>
      </div>

      <div class="mt-5">
        <Card>
          <CardHeader title="Recent failures" />
          <Show when={!overview.isPending} fallback={<Skeleton class="m-3.5 h-16" />}>
            <Show
              when={(overview.data?.failures.length ?? 0) > 0}
              fallback={
                <p class="px-5 py-8 text-center text-xs text-muted">
                  Nothing has failed recently.
                </p>
              }
            >
              <div class="divide-y divide-border">
                <For each={overview.data!.failures}>
                  {(failure) => (
                    <A
                      href={`/jobs/${failure.jobUuid}`}
                      class="flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <span class="shrink-0 pt-0.5">
                        <OutcomeBadge state="done" outcome={failure.outcome} />
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm text-primary">{failure.jobName}</p>
                        <p class="break-anywhere text-2xs text-muted">
                          {failure.error ?? `HTTP ${failure.statusCode ?? '—'}`}
                        </p>
                      </div>
                      <span class="num shrink-0 text-2xs text-muted">
                        {relativeTime(failure.finishedAt)}
                      </span>
                    </A>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Card>
      </div>
    </Shell>
  )
}
