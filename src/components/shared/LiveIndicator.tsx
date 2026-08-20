import { Show } from 'solid-js'
import { cn } from '../../lib/utils'
import { relativeTime } from '../../lib/format'
import type { ConnectionState } from '../../lib/events'

export type { ConnectionState }

/**
 * A dashboard that silently stops updating is worse than one that admits it,
 * because it still looks like it is working. This says which of the two you are
 * looking at.
 */
export function LiveIndicator(props: { state: ConnectionState; lastEventAt?: string }) {
  const tone = () =>
    ({
      live: { dot: 'bg-ok', text: 'text-muted', label: 'Live' },
      connecting: { dot: 'bg-late', text: 'text-late', label: 'Connecting' },
      reconnecting: { dot: 'bg-fail', text: 'text-fail', label: 'Reconnecting' },
    })[props.state]

  return (
    <span
      class={cn('inline-flex items-center gap-1.5 text-2xs', tone().text)}
      title={props.lastEventAt ? `Last event ${relativeTime(props.lastEventAt)}` : undefined}
    >
      <span class="relative inline-flex h-1.5 w-1.5">
        <Show when={props.state === 'live'}>
          <span class={cn('absolute inline-flex h-1.5 w-1.5 rounded-full animate-pulse-dot', tone().dot)} />
        </Show>
        <span class={cn('relative inline-flex h-1.5 w-1.5 rounded-full', tone().dot)} />
      </span>
      {tone().label}
    </span>
  )
}
