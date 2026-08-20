import { splitProps, type JSX } from 'solid-js'
import { cn } from '../../lib/utils'

export function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <div class={cn('min-w-0 rounded-lg border border-border bg-surface-1', local.class)} {...rest} />
  )
}

export function CardHeader(
  props: JSX.HTMLAttributes<HTMLDivElement> & { title?: string; action?: JSX.Element },
) {
  const [local, rest] = splitProps(props, ['class', 'title', 'action', 'children'])
  return (
    <div
      class={cn(
        'flex h-11 min-w-0 items-center justify-between gap-2 border-b border-border px-3.5',
        local.class,
      )}
      {...rest}
    >
      <h2 class="truncate text-xs font-medium uppercase tracking-wide text-muted">{local.title}</h2>
      {local.action}
      {local.children}
    </div>
  )
}

export function CardBody(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return <div class={cn('min-w-0 p-3.5', local.class)} {...rest} />
}
