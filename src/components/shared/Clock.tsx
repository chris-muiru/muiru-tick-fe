import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { browserTimezone } from '../../lib/format'

/**
 * The wall clock, ticking.
 *
 * Every other number on screen — "in 4m", "14s late", "next run 09:00" — is
 * relative to now, and a scheduler that never shows you now is asking you to
 * hold the reference in your head.
 */
export function Clock(props: { compact?: boolean }) {
  const [now, setNow] = createSignal(new Date())
  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const time = () =>
    now().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  return (
    <Show
      when={!props.compact}
      fallback={<span class="num text-xs tabular-nums text-secondary">{time()}</span>}
    >
      <div>
        <p class="num text-base leading-none tabular-nums text-primary xl:text-lg">{time()}</p>
        <p class="mt-1 hidden truncate text-2xs text-muted xl:block">{browserTimezone()}</p>
      </div>
    </Show>
  )
}
