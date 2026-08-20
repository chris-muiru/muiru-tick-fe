import { For, Show, createEffect, createSignal, createUniqueId, onCleanup } from 'solid-js'
import { cn } from '../../lib/utils'

export type Option = { value: string; label: string; hint?: string; trailing?: string }

/**
 * A real listbox, not a native <select>.
 *
 * The native control cannot show a second line, cannot be styled to match
 * anything, and renders as an OS widget that looks pasted in from another
 * application. Half the choices in this product need explaining at the moment
 * of choosing — "queue it behind" wants "up to the depth you set, then the slot
 * is recorded as queue-full" sitting under it — and a native option element
 * cannot carry that.
 */
export function Select(props: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
  class?: string
  invalid?: boolean
  id?: string
}) {
  const [open, setOpen] = createSignal(false)
  const [active, setActive] = createSignal(0)
  const listId = createUniqueId()
  let root: HTMLDivElement | undefined

  const selected = () => props.options.find((option) => option.value === props.value)

  const commit = (value: string) => {
    props.onChange(value)
    setOpen(false)
  }

  const openList = () => {
    setActive(Math.max(0, props.options.findIndex((o) => o.value === props.value)))
    setOpen(true)
  }

  // Clicking away closes it. Registered only while open, so a page full of
  // these does not carry a listener each.
  createEffect(() => {
    if (!open()) return
    const away = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    onCleanup(() => document.removeEventListener('mousedown', away))
  })

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openList()
      }
      return
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setActive((i) => Math.min(props.options.length - 1, i + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(props.options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(props.options[active()]?.value ?? props.value)
        break
    }
  }

  return (
    <div class={cn('relative', props.class)} ref={root}>
      <button
        type="button"
        id={props.id}
        role="combobox"
        aria-expanded={open()}
        aria-controls={listId}
        aria-invalid={props.invalid}
        onClick={() => (open() ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        class={cn(
          'flex h-9 w-full items-center gap-2 rounded border bg-surface-1 px-2.5 text-left text-sm text-primary transition-colors',
          props.invalid ? 'border-fail' : 'border-border hover:border-border-strong',
          open() && 'border-accent',
        )}
      >
        <span class={cn('flex-1 truncate', !selected() && 'text-muted')}>
          {selected()?.label ?? props.placeholder ?? 'Choose…'}
        </span>
        <Show when={selected()?.trailing}>
          <span class="num shrink-0 text-2xs text-muted">{selected()!.trailing}</span>
        </Show>
        <span aria-hidden="true" class="shrink-0 text-2xs text-muted">
          ▾
        </span>
      </button>

      <Show when={open()}>
        <ul
          id={listId}
          role="listbox"
          class="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded border border-border-strong bg-surface-1 py-1 shadow-lg shadow-black/30"
        >
          <For each={props.options}>
            {(option, index) => (
              <li
                role="option"
                aria-selected={option.value === props.value}
                onMouseEnter={() => setActive(index())}
                onClick={() => commit(option.value)}
                class={cn(
                  'cursor-pointer px-2.5 py-1.5',
                  index() === active() && 'bg-surface-2',
                  option.value === props.value && 'text-accent',
                )}
              >
                <div class="flex items-baseline gap-2">
                  <span class="flex-1 truncate text-sm">{option.label}</span>
                  <Show when={option.trailing}>
                    <span class="num shrink-0 text-2xs text-muted">{option.trailing}</span>
                  </Show>
                </div>
                <Show when={option.hint}>
                  <p class="mt-0.5 text-2xs leading-snug text-muted">{option.hint}</p>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
