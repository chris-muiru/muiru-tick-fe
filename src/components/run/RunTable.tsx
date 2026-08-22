import { Show, createMemo, createSignal } from 'solid-js'
import { OutcomeDot, OutcomeLabel } from '../shared/Outcome'
import { DataTable, type DataTableColumn } from '../shared/table/DataTable'
import { RetryChain } from './RetryChain'
import { Badge } from '../ui/badge'
import { clockTime, duration, lateness } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { Run } from '../../types'

type RunOccurrence = { attempts: Run[]; last: Run }

/**
 * Runs are grouped by occurrence, so a slot that took three attempts is one row
 * that expands rather than three rows that have to be mentally reassembled.
 * The API returns the recent window; this table paginates occurrences inside it.
 */
export function RunTable(props: { runs: Run[] | undefined; loading?: boolean; timezone?: string }) {
  const [expanded, setExpanded] = createSignal<string | null>(null)

  const occurrences = createMemo(() => {
    const groups = new Map<string, Run[]>()
    for (const run of props.runs ?? []) {
      const existing = groups.get(run.occurrenceId)
      if (existing) existing.push(run)
      else groups.set(run.occurrenceId, [run])
    }
    return [...groups.values()].map((attempts) => {
      const ordered = [...attempts].sort((a, b) => a.attempt - b.attempt)
      return { attempts: ordered, last: ordered[ordered.length - 1] }
    })
  })

  const isOpen = (occurrence: RunOccurrence) => expanded() === occurrence.last.occurrenceId
  const toggle = (occurrence: RunOccurrence) =>
    setExpanded(isOpen(occurrence) ? null : occurrence.last.occurrenceId)

  const columns: DataTableColumn<RunOccurrence>[] = [
    {
      id: 'scheduled',
      label: 'Scheduled',
      sortable: true,
      sortValue: (occurrence) => occurrence.last.scheduledFor,
      cell: (occurrence) => (
        <div class="flex items-center gap-3">
          <OutcomeDot state={occurrence.last.state} outcome={occurrence.last.outcome} live />
          <span class="num text-xs text-primary">
            {clockTime(occurrence.last.scheduledFor, props.timezone)}
          </span>
        </div>
      ),
    },
    {
      id: 'outcome',
      label: 'Outcome',
      sortable: true,
      sortValue: (occurrence) => occurrence.last.outcome ?? occurrence.last.state,
      cell: (occurrence) => (
        <OutcomeLabel state={occurrence.last.state} outcome={occurrence.last.outcome} />
      ),
    },
    {
      id: 'status',
      label: 'HTTP',
      numeric: true,
      sortable: true,
      sortValue: (occurrence) => occurrence.last.statusCode ?? -1,
      cell: (occurrence) => occurrence.last.statusCode ?? '—',
    },
    {
      id: 'duration',
      label: 'Duration',
      numeric: true,
      sortable: true,
      sortValue: (occurrence) => occurrence.last.durationMs ?? -1,
      cell: (occurrence) => duration(occurrence.last.durationMs),
    },
    {
      id: 'lateness',
      label: 'Lateness',
      numeric: true,
      sortable: true,
      sortValue: (occurrence) => occurrence.last.latenessMs ?? -1,
      cell: (occurrence) => (
        <span class={cn((occurrence.last.latenessMs ?? 0) > 5000 ? 'text-late' : 'text-muted')}>
          {lateness(occurrence.last.latenessMs)}
        </span>
      ),
    },
    {
      id: 'attempts',
      label: '',
      cell: (occurrence) => (
        <div class="flex items-center justify-end gap-1.5">
          <Show when={occurrence.last.trigger !== 'schedule'}>
            <Badge variant="neutral">{occurrence.last.trigger}</Badge>
          </Show>
          <Show when={occurrence.attempts.length > 1}>
            <Badge variant="late">{occurrence.attempts.length} attempts</Badge>
          </Show>
          <span aria-hidden="true" class="text-muted">{isOpen(occurrence) ? '▾' : '▸'}</span>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={occurrences()}
      columns={columns}
      rowKey={(occurrence) => occurrence.last.occurrenceId}
      isLoading={props.loading}
      pageSize={10}
      emptyTitle="Nothing has run yet"
      emptyHint="Use “Run now” to send one immediately."
      onRowClick={toggle}
      rowDetail={(occurrence) =>
        isOpen(occurrence) ? <RetryChain runs={occurrence.attempts} /> : undefined
      }
      mobileCard={(occurrence) => (
        <div class="flex items-start gap-2.5">
          <OutcomeDot state={occurrence.last.state} outcome={occurrence.last.outcome} live />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="num text-xs text-primary">
                {clockTime(occurrence.last.scheduledFor, props.timezone)}
              </span>
              <OutcomeLabel state={occurrence.last.state} outcome={occurrence.last.outcome} />
            </div>
            <p class="num mt-1 text-2xs text-muted">
              HTTP {occurrence.last.statusCode ?? '—'} · {duration(occurrence.last.durationMs)} ·{' '}
              {lateness(occurrence.last.latenessMs)}
            </p>
            <Show when={occurrence.attempts.length > 1}>
              <Badge variant="late" class="mt-1">{occurrence.attempts.length} attempts</Badge>
            </Show>
          </div>
          <span aria-hidden="true" class="text-muted">{isOpen(occurrence) ? '▾' : '▸'}</span>
        </div>
      )}
    />
  )
}
