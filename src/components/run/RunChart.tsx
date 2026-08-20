import { For, Show, createMemo } from 'solid-js'
import type { SeriesPoint } from '../../types'

/**
 * Duration and lateness over time, as one inline SVG.
 *
 * Two series on one axis because they answer the same question from opposite
 * ends: duration is how long your endpoint took, lateness is how long we made
 * you wait before asking. A chart library would be a dependency and a theme
 * problem for something this shape.
 */
export function RunChart(props: { points: SeriesPoint[]; height?: number }) {
  const height = () => props.height ?? 140
  const width = 720
  const padding = { top: 8, right: 8, bottom: 16, left: 34 }

  const scale = createMemo(() => {
    const points = props.points
    if (points.length === 0) return null
    const max = Math.max(1, ...points.map((p) => Math.max(p.durationMs, p.latenessMs)))
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height() - padding.top - padding.bottom
    const x = (index: number) =>
      padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
    const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight
    return { max, x, y, plotHeight }
  })

  const path = (pick: (p: SeriesPoint) => number) => {
    const s = scale()
    if (!s) return ''
    return props.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${s.x(i)},${s.y(pick(p))}`).join(' ')
  }

  return (
    <Show
      when={scale()}
      fallback={
        <p class="px-3.5 py-10 text-center text-xs text-muted">
          No completed runs in this window yet.
        </p>
      }
    >
      {(s) => (
        <div class="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height()}`}
            class="h-auto w-full min-w-[420px]"
            role="img"
            aria-label="Run duration and lateness over time"
          >
            <For each={[0, 0.5, 1]}>
              {(fraction) => (
                <g>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={padding.top + s().plotHeight * fraction}
                    y2={padding.top + s().plotHeight * fraction}
                    class="stroke-border"
                    stroke-width="1"
                  />
                  <text
                    x={padding.left - 6}
                    y={padding.top + s().plotHeight * fraction + 3}
                    text-anchor="end"
                    class="fill-[hsl(var(--text-muted))] text-[9px]"
                  >
                    {formatAxis(s().max * (1 - fraction))}
                  </text>
                </g>
              )}
            </For>

            <path d={path((p) => p.latenessMs)} fill="none" class="stroke-late" stroke-width="1.5" stroke-dasharray="3 3" />
            <path d={path((p) => p.durationMs)} fill="none" class="stroke-accent" stroke-width="1.5" />

            {/* Failures are marked rather than left to be inferred from a dip. */}
            <For each={props.points}>
              {(point, index) => (
                <Show when={!point.success}>
                  <circle cx={s().x(index())} cy={s().y(point.durationMs)} r="2.5" class="fill-fail" />
                </Show>
              )}
            </For>
          </svg>

          <div class="flex gap-4 px-3.5 pb-2 text-2xs text-muted">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-0.5 w-4 bg-accent" /> duration
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-0.5 w-4 border-t border-dashed border-late" /> lateness
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-fail" /> failed
            </span>
          </div>
        </div>
      )}
    </Show>
  )
}

function formatAxis(ms: number): string {
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}m`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
