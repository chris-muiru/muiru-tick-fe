import { Show } from 'solid-js'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { Outcome, RunState } from '../../types'

type Variant = 'ok' | 'fail' | 'late' | 'skipped' | 'neutral' | 'accent'
type Tone = { dot: string; text: string; label: string; glyph: string; variant: Variant }

/**
 * Every outcome carries a glyph and a word as well as a colour — roughly one in
 * twelve men cannot separate the red from the green on their own.
 *
 * The wording matters as much as the colour. "Skipped — a previous run was
 * still going" is a diagnosis; "skipped_overlap" is a log line.
 */
const TONE: Record<string, Tone> = {
  success: { dot: 'bg-ok', text: 'text-ok', label: 'Succeeded', glyph: '●', variant: 'ok' },
  failure: { dot: 'bg-fail', text: 'text-fail', label: 'Failed', glyph: '▲', variant: 'fail' },
  timeout: { dot: 'bg-fail', text: 'text-fail', label: 'Timed out', glyph: '◷', variant: 'fail' },
  connection_error: { dot: 'bg-fail', text: 'text-fail', label: 'Unreachable', glyph: '⊘', variant: 'fail' },
  lost: { dot: 'bg-late', text: 'text-late', label: 'Lost', glyph: '⚑', variant: 'late' },
  blocked: { dot: 'bg-fail', text: 'text-fail', label: 'Blocked', glyph: '⊗', variant: 'fail' },
  skipped_overlap: { dot: 'bg-skipped', text: 'text-skipped', label: 'Skipped, overlapped', glyph: '⇥', variant: 'skipped' },
  skipped_queue_full: { dot: 'bg-skipped', text: 'text-skipped', label: 'Skipped, queue full', glyph: '⇥', variant: 'skipped' },
  skipped_catchup: { dot: 'bg-skipped', text: 'text-skipped', label: 'Skipped, missed', glyph: '⇥', variant: 'skipped' },
  catchup_window_exceeded: { dot: 'bg-skipped', text: 'text-skipped', label: 'Outside catch-up window', glyph: '⇥', variant: 'skipped' },
  dst_nonexistent_time: { dot: 'bg-skipped', text: 'text-skipped', label: 'Clock change', glyph: '◑', variant: 'skipped' },
  expired: { dot: 'bg-skipped', text: 'text-skipped', label: 'Expired', glyph: '⌛', variant: 'skipped' },
  pending: { dot: 'bg-idle', text: 'text-muted', label: 'Queued', glyph: '◌', variant: 'neutral' },
  running: { dot: 'bg-accent', text: 'text-accent', label: 'Running', glyph: '▸', variant: 'accent' },
  never: { dot: 'bg-idle', text: 'text-muted', label: 'Not run yet', glyph: '◌', variant: 'neutral' },
}

/** Why a run ended the way it did, in a sentence the customer can act on. */
export const OUTCOME_EXPLANATION: Record<string, string> = {
  timeout: 'Your endpoint did not respond inside the job timeout.',
  connection_error: 'We could not open a connection to your endpoint.',
  lost: 'The worker running this attempt disappeared. This one is on us, and it was retried.',
  blocked: 'The target resolved to a private or loopback address, which we refuse to call.',
  skipped_overlap: 'The previous run was still going when this slot came round.',
  skipped_queue_full: 'Runs were already queued to the configured depth.',
  skipped_catchup: 'This slot passed while the job was behind, and the catch-up policy skipped it.',
  catchup_window_exceeded: 'This slot was older than the catch-up window allows.',
  dst_nonexistent_time: 'This local time did not exist on that day because the clock moved forward.',
  expired: 'This run stayed queued so long that firing it would have been misleading.',
}

export function toneFor(state: RunState, outcome: Outcome | null): Tone {
  if (state === 'running') return TONE.running
  if (state === 'pending') return TONE.pending
  return TONE[outcome ?? 'never'] ?? TONE.never
}

export function OutcomeDot(props: { state: RunState; outcome: Outcome | null; live?: boolean; class?: string }) {
  const tone = () => toneFor(props.state, props.outcome)
  return (
    <span class={cn('relative inline-flex h-2 w-2 shrink-0', props.class)} aria-hidden="true">
      <Show when={props.live && props.state === 'running'}>
        <span class={cn('absolute inline-flex h-2 w-2 rounded-full animate-pulse-dot', tone().dot)} />
      </Show>
      <span class={cn('relative inline-flex h-2 w-2 rounded-full', tone().dot)} />
    </span>
  )
}

export function OutcomeLabel(props: { state: RunState; outcome: Outcome | null; class?: string }) {
  const tone = () => toneFor(props.state, props.outcome)
  return (
    <span class={cn('inline-flex items-center gap-1.5 text-xs font-medium', tone().text, props.class)}>
      <span aria-hidden="true" class="text-[9px] leading-none">
        {tone().glyph}
      </span>
      {tone().label}
    </span>
  )
}

export function OutcomeBadge(props: { state: RunState; outcome: Outcome | null }) {
  const tone = () => toneFor(props.state, props.outcome)
  return (
    <Badge variant={tone().variant}>
      <span aria-hidden="true" class="text-[9px] leading-none">
        {tone().glyph}
      </span>
      {tone().label}
    </Badge>
  )
}
