import { Show, createSignal, onCleanup } from 'solid-js'
import { cn } from '../../lib/utils'

/**
 * Two-step delete, in place.
 *
 * A native confirm() blocks the whole tab and looks like a browser warning
 * rather than part of the product; a modal is a lot of machinery for a table
 * row. This asks in the space the button already occupies, and reverts on its
 * own so a half-pressed delete never sits armed on screen.
 */
export function ConfirmButton(props: {
  label?: string
  confirmLabel?: string
  question?: string
  onConfirm: () => void
  pending?: boolean
  class?: string
}) {
  const [armed, setArmed] = createSignal(false)
  let timer: ReturnType<typeof setTimeout>
  onCleanup(() => clearTimeout(timer))

  const arm = () => {
    setArmed(true)
    clearTimeout(timer)
    timer = setTimeout(() => setArmed(false), 4000)
  }

  return (
    <Show
      when={armed()}
      fallback={
        <button
          type="button"
          onClick={arm}
          class={cn(
            'rounded px-2 py-1 text-2xs text-muted transition-colors hover:bg-surface-2 hover:text-fail',
            props.class,
          )}
        >
          {props.label ?? 'Delete'}
        </button>
      }
    >
      <span class="inline-flex items-center gap-1 whitespace-nowrap">
        <span class="text-2xs text-muted">{props.question ?? 'Sure?'}</span>
        <button
          type="button"
          disabled={props.pending}
          onClick={() => {
            clearTimeout(timer)
            setArmed(false)
            props.onConfirm()
          }}
          class="rounded bg-fail px-2 py-1 text-2xs font-medium text-white disabled:opacity-50"
        >
          {props.confirmLabel ?? 'Delete'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearTimeout(timer)
            setArmed(false)
          }}
          class="rounded px-1.5 py-1 text-2xs text-muted hover:text-primary"
        >
          No
        </button>
      </span>
    </Show>
  )
}
