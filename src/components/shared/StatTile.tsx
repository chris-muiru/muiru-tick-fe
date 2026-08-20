import { Show } from 'solid-js'
import { Skeleton } from '../ui/skeleton'
import { cn } from '../../lib/utils'

/**
 * Label above, value below, note beside. No icons, no card shadow, no oversized
 * numeral with a whispered caption — the number is the content, and it is
 * monospace so it does not shift as it updates.
 */
export function StatTile(props: {
  label: string
  value: string
  tone?: 'ok' | 'fail' | 'late' | 'neutral'
  loading?: boolean
  hint?: string
}) {
  const toneClass = () =>
    ({ ok: 'text-ok', fail: 'text-fail', late: 'text-late', neutral: 'text-primary' })[
      props.tone ?? 'neutral'
    ]
  return (
    <div class="min-w-0 border-l border-border px-3.5 py-2.5 first:border-l-0 first:pl-0">
      <p class="truncate text-2xs uppercase tracking-wide text-muted">{props.label}</p>
      <Show when={!props.loading} fallback={<Skeleton class="mt-1.5 h-6 w-20" />}>
        <div class="mt-0.5 flex items-baseline gap-2">
          <span class={cn('num text-xl font-medium tabular-nums', toneClass())}>{props.value}</span>
        </div>
      </Show>
      <Show when={props.hint}>
        <p class="mt-0.5 truncate text-2xs text-muted">{props.hint}</p>
      </Show>
    </div>
  )
}
