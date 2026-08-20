import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Skeleton } from '../ui/skeleton'
import { clockTime, countdown } from '../../lib/format'
import type { SchedulePreview as Preview } from '../../types'

/**
 * The most important component in this product.
 *
 * A wrong cron expression shipped silently is the worst failure mode in the
 * category — nothing errors, nothing alerts, and the job simply never runs at
 * the time somebody promised it would. So the sentence is large, the next five
 * fire times are concrete, and both come from the server, computed by the same
 * code the scheduler evaluates. There is no second opinion to disagree with.
 */
export function SchedulePreview(props: {
  preview: Preview | undefined
  loading?: boolean
  timezone: string
}) {
  const [now, setNow] = createSignal(Date.now())
  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <div class="rounded-lg border border-accent/30 bg-accent/5">
      <div class="border-b border-accent/20 px-3.5 py-2">
        <p class="text-2xs uppercase tracking-wide text-accent">This job will run</p>
      </div>

      <Show
        when={!props.loading}
        fallback={
          <div class="space-y-2 p-3.5">
            <Skeleton class="h-6 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
          </div>
        }
      >
        <Show
          when={props.preview?.valid}
          fallback={
            <div class="p-3.5">
              <p class="text-sm font-medium text-fail">This schedule is not valid.</p>
              <p class="mt-1 text-xs text-secondary">
                {props.preview?.error ?? 'Enter a schedule to see when it runs.'}
              </p>
            </div>
          }
        >
          <div class="p-3.5">
            <p class="text-base font-medium leading-snug text-primary">{props.preview!.human}</p>

            <div class="mt-3">
              <p class="text-2xs uppercase tracking-wide text-muted">Next five runs</p>
              <ul class="mt-1.5 space-y-1">
                <For each={props.preview!.runs}>
                  {(at, index) => (
                    <li class="flex items-baseline justify-between gap-3 text-xs">
                      <span class="num text-primary">{clockTime(at, props.timezone)}</span>
                      <span class="num shrink-0 text-2xs text-muted">
                        {/* Reading now() keeps the countdown ticking without
                            re-fetching the preview. */}
                        {now() && index() === 0 ? countdown(at) : relativeGap(props.preview!.runs, index())}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
              <p class="mt-1.5 text-2xs text-muted">
                Shown in {props.timezone}, the job's own timezone.
              </p>
            </div>

            <Show when={props.preview!.notes?.length}>
              <ul class="mt-3 space-y-1 border-t border-accent/20 pt-2.5">
                <For each={props.preview!.notes}>
                  {(note) => <li class="text-2xs leading-relaxed text-secondary">{note}</li>}
                </For>
              </ul>
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  )
}

/** Rows after the first say how far they are from the one before, not from now. */
function relativeGap(runs: string[], index: number): string {
  if (index === 0) return ''
  const gap = (new Date(runs[index]).getTime() - new Date(runs[index - 1]).getTime()) / 1000
  if (gap < 60) return `+${Math.round(gap)}s`
  if (gap < 3600) return `+${Math.round(gap / 60)}m`
  if (gap < 86400) return `+${Math.round(gap / 3600)}h`
  return `+${Math.round(gap / 86400)}d`
}
