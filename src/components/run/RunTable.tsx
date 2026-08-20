import { For, Show, createMemo, createSignal } from 'solid-js'
import { OutcomeDot, OutcomeLabel } from '../shared/Outcome'
import { RetryChain } from './RetryChain'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import { clockTime, duration, lateness } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { Run } from '../../types'

/**
 * Runs are grouped by occurrence, so a slot that took three attempts is one row
 * that expands rather than three rows that have to be mentally reassembled.
 * Only the visible window is rendered; the list is paged from the server.
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

  return (
    <Show
      when={!props.loading}
      fallback={
        <div class="divide-y divide-border">
          <For each={[0, 1, 2, 3, 4]}>
            {() => (
              <div class="flex items-center gap-3 px-3.5 py-2.5">
                <Skeleton class="h-2 w-2 rounded-full" />
                <Skeleton class="h-3 w-40" />
                <Skeleton class="ml-auto h-3 w-24" />
              </div>
            )}
          </For>
        </div>
      }
    >
      <Show
        when={occurrences().length > 0}
        fallback={
          <p class="px-5 py-10 text-center text-xs text-muted">
            Nothing has run yet. Use “Run now” to send one immediately.
          </p>
        }
      >
        <div class="divide-y divide-border">
          <For each={occurrences()}>
            {(occurrence) => {
              const run = occurrence.last
              const open = () => expanded() === run.occurrenceId
              const retried = occurrence.attempts.length > 1
              return (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpanded(open() ? null : run.occurrenceId)}
                    class={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2',
                      open() && 'bg-surface-2',
                    )}
                  >
                    <OutcomeDot state={run.state} outcome={run.outcome} live />
                    <span class="num w-[132px] shrink-0 text-xs text-primary">
                      {clockTime(run.scheduledFor, props.timezone)}
                    </span>
                    <span class="hidden w-32 shrink-0 sm:block">
                      <OutcomeLabel state={run.state} outcome={run.outcome} />
                    </span>
                    <span class="num hidden w-16 shrink-0 text-xs text-secondary md:block">
                      {run.statusCode ?? '—'}
                    </span>
                    <span class="num hidden w-20 shrink-0 text-xs text-secondary md:block">
                      {duration(run.durationMs)}
                    </span>
                    <span
                      class={cn(
                        'num hidden w-24 shrink-0 text-xs md:block',
                        (run.latenessMs ?? 0) > 5000 ? 'text-late' : 'text-muted',
                      )}
                    >
                      {lateness(run.latenessMs)}
                    </span>
                    <span class="ml-auto flex shrink-0 items-center gap-1.5">
                      <Show when={run.trigger !== 'schedule'}>
                        <Badge variant="neutral">{run.trigger}</Badge>
                      </Show>
                      <Show when={retried}>
                        <Badge variant="late">{occurrence.attempts.length} attempts</Badge>
                      </Show>
                      <span aria-hidden="true" class="text-muted">
                        {open() ? '▾' : '▸'}
                      </span>
                    </span>
                  </button>

                  <Show when={open()}>
                    <div class="border-t border-border bg-surface-0 p-3.5">
                      <RetryChain runs={occurrence.attempts} />
                    </div>
                  </Show>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </Show>
  )
}
