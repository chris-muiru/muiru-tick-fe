import { For, Show } from 'solid-js'

const TONE: Record<string, string> = {
  success: 'bg-ok',
  failure: 'bg-fail',
  timeout: 'bg-fail',
  connection_error: 'bg-fail',
  blocked: 'bg-fail',
  lost: 'bg-late',
  running: 'bg-accent',
  pending: 'bg-idle',
}

/**
 * The last twenty runs, oldest left.
 *
 * A single last-run badge cannot tell a steady job from one that has failed
 * twice this week from one that broke an hour ago. Twenty marks can, in the
 * width of a table cell.
 */
export function RunStrip(props: { outcomes: string[] | undefined; class?: string }) {
  const marks = () => props.outcomes ?? []
  return (
    <Show
      when={marks().length > 0}
      fallback={<span class="text-2xs text-muted">no runs yet</span>}
    >
      <span class="inline-flex items-end gap-[2px]" aria-hidden="true">
        <For each={marks()}>
          {(outcome) => (
            <span
              title={outcome}
              class={`h-3.5 w-[3px] rounded-[1px] ${TONE[outcome] ?? 'bg-skipped'}`}
            />
          )}
        </For>
      </span>
    </Show>
  )
}
