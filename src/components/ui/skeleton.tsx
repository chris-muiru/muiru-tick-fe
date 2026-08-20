import { splitProps, type JSX } from 'solid-js'
import { cn } from '../../lib/utils'

/**
 * Shaped placeholders, not spinners. A skeleton matching the footprint of what
 * replaces it keeps the layout stable from first paint — a dashboard that
 * reflows as each widget lands feels broken.
 */
export function Skeleton(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return <div class={cn('animate-pulse rounded bg-surface-2', local.class)} aria-hidden="true" {...rest} />
}
