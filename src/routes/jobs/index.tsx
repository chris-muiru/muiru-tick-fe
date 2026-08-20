import { A } from '@solidjs/router'
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Shell } from '../../components/shared/Shell'
import { OutcomeDot } from '../../components/shared/Outcome'
import { RunStrip } from '../../components/shared/RunStrip'
import { Card, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { useJobMutations, useJobsQuery } from '../../resource/job/hook'
import { countdown, duration, percent } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { Job } from '../../types'

export default function Jobs() {
  const jobs = useJobsQuery()
  const mutations = useJobMutations()
  const [filter, setFilter] = createSignal('')
  const [now, setNow] = createSignal(Date.now())
  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const visible = () => {
    const needle = filter().toLowerCase().trim()
    const all = jobs.data ?? []
    if (!needle) return all
    return all.filter(
      (job) =>
        job.name.toLowerCase().includes(needle) ||
        job.request.url.toLowerCase().includes(needle) ||
        job.schedule.human.toLowerCase().includes(needle),
    )
  }

  return (
    <Shell>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-medium tracking-tight text-primary">Jobs</h1>
        <Input
          class="h-8 w-48 sm:w-64"
          placeholder="Filter by name, URL or schedule"
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
        />
        <A
          href="/jobs/new"
          class="ml-auto rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
        >
          New job
        </A>
      </div>

      <Card>
        <CardHeader title={`${visible().length} job${visible().length === 1 ? '' : 's'}`} />

        <Show
          when={!jobs.isPending}
          fallback={
            <div class="divide-y divide-border">
              <For each={[0, 1, 2, 3]}>
                {() => (
                  <div class="flex items-center gap-3 px-3.5 py-3">
                    <Skeleton class="h-2 w-2 rounded-full" />
                    <Skeleton class="h-3 w-48" />
                    <Skeleton class="ml-auto h-3 w-32" />
                  </div>
                )}
              </For>
            </div>
          }
        >
          <Show
            when={visible().length > 0}
            fallback={
              <div class="px-5 py-12 text-center">
                <p class="text-sm font-medium text-primary">
                  {jobs.data?.length ? 'Nothing matches that filter.' : 'No jobs yet.'}
                </p>
                <p class="mx-auto mt-1 max-w-sm text-xs text-secondary">
                  A job is a schedule plus an HTTP endpoint. We call the endpoint on time,
                  retry it when it fails, and record every attempt.
                </p>
                <Show when={!jobs.data?.length}>
                  <A
                    href="/jobs/new"
                    class="mt-3 inline-block rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
                  >
                    Create the first one
                  </A>
                </Show>
              </div>
            }
          >
            {/* Header row on desktop only — on a phone the row itself carries
                its labels rather than pretending to be a spreadsheet. */}
            <div class="hidden items-center gap-3 border-b border-border px-3.5 py-1.5 text-2xs uppercase tracking-wide text-muted lg:flex">
              <span class="w-2" />
              <span class="flex-1">Job</span>
              <span class="w-52">Schedule</span>
              <span class="w-[92px]">Last 20 runs</span>
              <span class="w-24">Next run</span>
              <span class="w-20 text-right">7-day</span>
              <span class="w-16" />
            </div>

            <div class="divide-y divide-border">
              <For each={visible()}>
                {(job) => (
                  <JobRow
                    job={job}
                    now={now()}
                    busy={mutations.pause.isPending || mutations.resume.isPending}
                    onToggle={() =>
                      job.enabled
                        ? mutations.pause.mutate(job.uuid)
                        : mutations.resume.mutate(job.uuid)
                    }
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Card>
    </Shell>
  )
}

function JobRow(props: { job: Job; now: number; busy: boolean; onToggle: () => void }) {
  const rate = () => props.job.successRate7d
  return (
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 transition-colors hover:bg-surface-2 lg:flex-nowrap">
      <OutcomeDot
        state={props.job.enabled ? 'done' : 'skipped'}
        outcome={props.job.enabled ? props.job.last.outcome : 'expired'}
      />

      <div class="min-w-0 flex-1">
        <A href={`/jobs/${props.job.uuid}`} class="block truncate text-sm text-primary hover:text-accent">
          {props.job.name}
        </A>
        <p class="num truncate text-2xs text-muted">
          {props.job.request.method} {props.job.request.url}
        </p>
      </div>

      <span class="w-full truncate text-xs text-secondary lg:w-52">{props.job.schedule.human}</span>

      {/* Twenty marks say whether this job is steady, flapping or newly broken.
          One last-run badge cannot. */}
      <span class="w-[92px] shrink-0" title="Oldest to newest">
        <RunStrip outcomes={props.job.recentOutcomes} />
      </span>

      <span class="num w-24 shrink-0 text-xs">
        <Show when={props.job.enabled} fallback={<span class="text-muted">paused</span>}>
          <span class="text-primary">{props.now ? countdown(props.job.schedule.nextRunAt) : ''}</span>
        </Show>
      </span>

      <span
        class={cn(
          'num w-20 shrink-0 text-right text-xs',
          rate() === null ? 'text-muted' : rate()! < 99 ? 'text-fail' : 'text-ok',
        )}
        title={`${props.job.runs7d} runs in the last 7 days`}
      >
        {percent(rate())}
      </span>

      <button
        type="button"
        onClick={props.onToggle}
        disabled={props.busy}
        class="w-16 shrink-0 rounded border border-border px-2 py-1 text-2xs text-secondary transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-50"
      >
        {props.job.enabled ? 'Pause' : 'Resume'}
      </button>
    </div>
  )
}
