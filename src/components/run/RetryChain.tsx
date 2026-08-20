import { For, Show } from 'solid-js'
import { OutcomeBadge, OUTCOME_EXPLANATION } from '../shared/Outcome'
import { Skeleton } from '../ui/skeleton'
import { clockTime, duration } from '../../lib/format'
import type { Run } from '../../types'

/**
 * Attempts of one scheduled slot, and what changed between them.
 *
 * Three flat rows in a table say a job failed three times. This says the first
 * attempt got a 503 in 120ms, we waited 30 seconds, the second timed out, we
 * waited two minutes, and the third succeeded — which is the difference between
 * a log and a diagnosis.
 */
export function RetryChain(props: { runs: Run[] | undefined; loading?: boolean }) {
  return (
    <Show when={!props.loading} fallback={<Skeleton class="h-24 w-full" />}>
      <ol class="relative space-y-0">
        <For each={props.runs}>
          {(run, index) => {
            const previous = () => props.runs?.[index() - 1]
            const gap = () => {
              const before = previous()
              if (!before?.finishedAt || !run.startedAt) return null
              return new Date(run.startedAt).getTime() - new Date(before.finishedAt).getTime()
            }
            return (
              <li>
                <Show when={gap() !== null}>
                  <div class="ml-[13px] flex items-center gap-2 border-l border-dashed border-border py-1.5 pl-4">
                    <span class="num text-2xs text-muted">waited {duration(gap())}</span>
                  </div>
                </Show>

                <div class="flex items-start gap-3 rounded border border-border bg-surface-1 p-2.5">
                  <span class="num mt-0.5 grid h-6 w-7 shrink-0 place-items-center rounded bg-surface-2 text-2xs text-secondary">
                    #{run.attempt}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <OutcomeBadge state={run.state} outcome={run.outcome} />
                      <Show when={run.statusCode}>
                        <span class="num text-2xs text-secondary">HTTP {run.statusCode}</span>
                      </Show>
                      <span class="num text-2xs text-muted">{duration(run.durationMs)}</span>
                      <span class="num ml-auto text-2xs text-muted">
                        {clockTime(run.startedAt ?? run.scheduledFor)}
                      </span>
                    </div>
                    <Show when={run.error}>
                      <p class="break-anywhere mt-1 text-2xs text-fail">{run.error}</p>
                    </Show>
                    <Show when={run.outcome && OUTCOME_EXPLANATION[run.outcome]}>
                      <p class="mt-1 text-2xs text-muted">{OUTCOME_EXPLANATION[run.outcome!]}</p>
                    </Show>
                    <Show when={run.responseSnippet}>
                      <pre class="break-anywhere num mt-1.5 max-h-32 overflow-auto rounded border border-border bg-surface-2 p-2 text-[10px] text-secondary">
                        {run.responseSnippet}
                      </pre>
                    </Show>
                  </div>
                </div>
              </li>
            )
          }}
        </For>
      </ol>
    </Show>
  )
}
