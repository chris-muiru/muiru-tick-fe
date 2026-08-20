import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { clockTime, duration, lateness } from '../../lib/format'
import type { Overview } from '../../types'

const WIDTH = 1000
const HEIGHT = 168
const AXIS = 96
const PAD = { left: 8, right: 8 }

/**
 * Past and future on one axis, around a live "now".
 *
 * Every scheduler in this category ships a table of what ran plus a list of
 * what is next. A table has no sense of interval and no sense of now, so it
 * cannot answer the question people actually open the page with: is the next
 * hour going to be busy, and has the last hour been on time?
 *
 * Below the axis is what happened — one bar per run, height by duration,
 * colour by outcome, with a horizontal tail showing how late it started.
 * Above the axis is what has not happened yet: occurrences computed from the
 * same schedules the engine evaluates, so the strip is a forecast rather than a
 * reading of rows that already exist.
 */
export function Timeline(props: { data: Overview['timeline'] | undefined; loading?: boolean }) {
  const [now, setNow] = createSignal(Date.now())
  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const scale = createMemo(() => {
    const data = props.data
    if (!data) return null
    const from = new Date(data.from).getTime()
    const to = new Date(data.to).getTime()
    const span = to - from
    if (span <= 0) return null

    const plot = WIDTH - PAD.left - PAD.right
    const x = (at: string | number) => {
      const time = typeof at === 'number' ? at : new Date(at).getTime()
      return PAD.left + ((time - from) / span) * plot
    }

    // Bars are scaled against the slowest run in the window rather than a fixed
    // ceiling, so a window of fast runs still has readable relief.
    const slowest = Math.max(1000, ...data.past.map((run) => run.durationMs ?? 0))
    const height = (ms: number | null) =>
      Math.max(3, Math.min(46, ((ms ?? 0) / slowest) * 46))

    const ticks: { at: number; label: string }[] = []
    const step = span > 6 * 3600_000 ? 3600_000 : span > 2 * 3600_000 ? 1800_000 : 900_000
    for (let at = Math.ceil(from / step) * step; at <= to; at += step) {
      ticks.push({
        at,
        label: new Date(at).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      })
    }
    return { from, to, x, height, ticks }
  })

  return (
    <section class="rounded border border-border bg-surface-1">
      <header class="flex h-9 items-center justify-between border-b border-border px-3">
        <h2 class="text-2xs font-medium uppercase tracking-wide text-muted">
          The last hour, and the next
        </h2>
        <div class="flex items-center gap-3 text-2xs text-muted">
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-1 bg-ok" /> ran
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-1 bg-fail" /> failed
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-0.5 w-3 bg-late" /> late
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-1 border border-accent" /> due
          </span>
        </div>
      </header>

      <Show
        when={scale()}
        fallback={
          <p class="px-3 py-14 text-center text-xs text-muted">
            {props.loading ? 'Reading the schedule…' : 'No jobs scheduled in this window.'}
          </p>
        }
      >
        {(s) => (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            class="h-[168px] w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Runs in the last hour and occurrences due in the next"
          >
            <For each={s().ticks}>
              {(tick) => (
                <g>
                  <line
                    x1={s().x(tick.at)}
                    x2={s().x(tick.at)}
                    y1={14}
                    y2={HEIGHT - 14}
                    class="stroke-border"
                    stroke-width="1"
                  />
                  <text
                    x={s().x(tick.at) + 3}
                    y={HEIGHT - 4}
                    class="fill-[hsl(var(--text-muted))] text-[9px]"
                  >
                    {tick.label}
                  </text>
                </g>
              )}
            </For>

            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={AXIS}
              y2={AXIS}
              class="stroke-border-strong"
              stroke-width="1"
            />

            {/* Future: hollow ticks above the axis. */}
            <For each={props.data!.future}>
              {(slot) => (
                <rect
                  x={s().x(slot.at) - 1}
                  y={AXIS - 20}
                  width="2"
                  height="18"
                  class="fill-accent/50"
                >
                  <title>{`${slot.jobName} — due ${clockTime(slot.at)}`}</title>
                </rect>
              )}
            </For>

            {/* Past: solid bars below, with a lateness tail along the axis. */}
            <For each={props.data!.past}>
              {(run) => {
                const tone =
                  run.state === 'skipped'
                    ? 'fill-skipped'
                    : run.outcome === 'success'
                      ? 'fill-ok'
                      : run.state === 'running'
                        ? 'fill-accent'
                        : 'fill-fail'
                const barHeight = s().height(run.durationMs)
                return (
                  <g>
                    <Show when={run.startedAt && (run.latenessMs ?? 0) > 2000}>
                      <line
                        x1={s().x(run.scheduledFor)}
                        x2={s().x(run.startedAt!)}
                        y1={AXIS + 2}
                        y2={AXIS + 2}
                        class="stroke-late"
                        stroke-width="2"
                      />
                    </Show>
                    <rect
                      x={s().x(run.startedAt ?? run.scheduledFor) - 1}
                      y={AXIS + 4}
                      width="2.5"
                      height={barHeight}
                      class={tone}
                    >
                      <title>
                        {`${run.jobName}\n${clockTime(run.scheduledFor)}\n${duration(run.durationMs)} · ${lateness(run.latenessMs)}`}
                      </title>
                    </rect>
                  </g>
                )
              }}
            </For>

            {/* Now. The one place this colour is used. */}
            <line
              x1={s().x(now())}
              x2={s().x(now())}
              y1={10}
              y2={HEIGHT - 14}
              class="stroke-now"
              stroke-width="1.5"
            />
            <circle cx={s().x(now())} cy={10} r="3" class="fill-now" />
            <text
              x={s().x(now()) + 6}
              y={13}
              class="fill-[hsl(var(--now))] text-[9px] font-medium"
            >
              now
            </text>
          </svg>
        )}
      </Show>

      <Show when={props.data}>
        <footer class="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-3 py-1.5 text-2xs text-muted">
          <span>
            <span class="num text-secondary">{props.data!.past.length}</span> ran
          </span>
          <span>
            <span class="num text-secondary">{props.data!.future.length}</span> due
          </span>
          <span class="ml-auto">hover a mark for the job and its timing</span>
        </footer>
      </Show>
    </section>
  )
}
