import { splitProps, type JSX } from 'solid-js'
import { cn } from '../../lib/utils'

export function Input(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <input
      class={cn(
        'h-9 w-full rounded border border-border bg-surface-1 px-2.5 text-sm text-primary',
        'placeholder:text-muted focus-visible:border-accent',
        'aria-[invalid=true]:border-fail',
        local.class,
      )}
      {...rest}
    />
  )
}

export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <select
      class={cn(
        'h-9 w-full rounded border border-border bg-surface-1 px-2 text-sm text-primary',
        local.class,
      )}
      {...rest}
    />
  )
}

export function Textarea(props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <textarea
      class={cn(
        'num w-full rounded border border-border bg-surface-1 px-2.5 py-2 text-xs text-primary',
        'placeholder:text-muted focus-visible:border-accent',
        local.class,
      )}
      {...rest}
    />
  )
}
