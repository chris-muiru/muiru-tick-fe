import { A } from '@solidjs/router'
import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Shell } from '../../components/shared/Shell'
import { OutcomeDot } from '../../components/shared/Outcome'
import { RunStrip } from '../../components/shared/RunStrip'
import { ConfirmButton } from '../../components/shared/ConfirmButton'
import { DataTable, type DataTableColumn } from '../../components/shared/table/DataTable'
import { Card, CardHeader } from '../../components/ui/card'
import { useJobMutations, useJobsQuery } from '../../resource/job/hook'
import { countdown, percent } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { Job } from '../../types'

export default function Jobs() {
  const jobs = useJobsQuery()
  const mutations = useJobMutations()
  const [now, setNow] = createSignal(Date.now())
  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const toggle = (job: Job) =>
    job.enabled ? mutations.pause.mutate(job.uuid) : mutations.resume.mutate(job.uuid)

  const columns: DataTableColumn<Job>[] = [
    {
      id: 'status',
      label: '',
      cell: (job) => (
        <OutcomeDot
          state={job.enabled ? 'done' : 'skipped'}
          outcome={job.enabled ? job.last.outcome : 'expired'}
        />
      ),
    },
    {
      id: 'job',
      label: 'Job',
      sortable: true,
      sortValue: (job) => job.name,
      cell: (job) => (
        <div class="min-w-0">
          <A href={`/jobs/${job.uuid}`} class="block truncate text-sm text-primary hover:text-accent">
            {job.name}
          </A>
          <p class="num max-w-sm truncate text-2xs text-muted">
            {job.request.method} {job.request.url}
          </p>
        </div>
      ),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      sortable: true,
      sortValue: (job) => job.schedule.human,
      class: 'max-w-52',
      cell: (job) => <span class="block truncate text-xs text-secondary">{job.schedule.human}</span>,
    },
    {
      id: 'runs',
      label: 'Last 20 runs',
      hideOnMobile: true,
      cell: (job) => (
        <span class="block w-[92px]" title="Oldest to newest">
          <RunStrip outcomes={job.recentOutcomes} />
        </span>
      ),
    },
    {
      id: 'next',
      label: 'Next run',
      numeric: true,
      sortable: true,
      sortValue: (job) => job.schedule.nextRunAt ?? '',
      cell: (job) => (
        <Show when={job.enabled} fallback={<span class="text-muted">paused</span>}>
          <span class="text-primary">{now() ? countdown(job.schedule.nextRunAt) : ''}</span>
        </Show>
      ),
    },
    {
      id: 'success',
      label: '7-day',
      numeric: true,
      sortable: true,
      sortValue: (job) => job.successRate7d ?? -1,
      cell: (job) => (
        <span
          class={cn(
            job.successRate7d === null
              ? 'text-muted'
              : job.successRate7d < 99
                ? 'text-fail'
                : 'text-ok',
          )}
          title={`${job.runs7d} runs in the last 7 days`}
        >
          {percent(job.successRate7d)}
        </span>
      ),
    },
    {
      id: 'actions',
      label: '',
      cell: (job) => (
        <div class="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggle(job)}
            disabled={mutations.pause.isPending || mutations.resume.isPending}
            class="rounded border border-border px-2 py-1 text-2xs text-secondary transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-50"
          >
            {job.enabled ? 'Pause' : 'Resume'}
          </button>
          <ConfirmButton
            question="Delete?"
            pending={mutations.remove.isPending}
            onConfirm={() => mutations.remove.mutate(job.uuid)}
          />
        </div>
      ),
    },
  ]

  return (
    <Shell>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-medium tracking-tight text-primary">Jobs</h1>
        <A
          href="/jobs/new"
          class="ml-auto rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
        >
          New job
        </A>
      </div>

      <Card>
        <CardHeader title={`${(jobs.data ?? []).length} job${jobs.data?.length === 1 ? '' : 's'}`} />
        <DataTable
          data={jobs.data ?? []}
          columns={columns}
          rowKey={(job) => job.uuid}
          isLoading={jobs.isPending}
          error={jobs.error as Error | null}
          onRefetch={() => jobs.refetch()}
          enableSearch
          searchPlaceholder="Filter by name, URL or schedule…"
          searchValue={(job) => `${job.name} ${job.request.url} ${job.schedule.human}`}
          emptyTitle="No jobs yet"
          emptyHint="A job is a schedule plus an HTTP endpoint. We call it on time, retry failures and record every attempt."
          emptyAction={
            <A href="/jobs/new" class="mt-1 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg">
              Create the first one
            </A>
          }
          mobileCard={(job) => (
            <div class="flex items-start gap-2.5">
              <OutcomeDot
                state={job.enabled ? 'done' : 'skipped'}
                outcome={job.enabled ? job.last.outcome : 'expired'}
              />
              <div class="min-w-0 flex-1">
                <A href={`/jobs/${job.uuid}`} class="block truncate text-sm font-medium text-primary hover:text-accent">
                  {job.name}
                </A>
                <p class="num truncate text-2xs text-muted">{job.request.method} {job.request.url}</p>
                <p class="mt-1 truncate text-xs text-secondary">{job.schedule.human}</p>
                <div class="mt-2 flex items-center gap-2">
                  <RunStrip outcomes={job.recentOutcomes} />
                  <span class="num ml-auto text-2xs text-muted">
                    {job.enabled ? countdown(job.schedule.nextRunAt) : 'paused'}
                  </span>
                </div>
                <div class="mt-2 flex justify-end gap-1">
                  {columns[6].cell(job)}
                </div>
              </div>
            </div>
          )}
        />
      </Card>
    </Shell>
  )
}
