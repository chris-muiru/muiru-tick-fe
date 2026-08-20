import { Show, type JSX } from 'solid-js'

export function Field(props: {
  label: string
  hint?: string
  error?: string
  children: JSX.Element
}) {
  return (
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-secondary">{props.label}</span>
      {props.children}
      <Show when={props.hint && !props.error}>
        <span class="mt-1 block text-2xs text-muted">{props.hint}</span>
      </Show>
      <Show when={props.error}>
        <span class="mt-1 block text-2xs text-fail">{props.error}</span>
      </Show>
    </label>
  )
}
