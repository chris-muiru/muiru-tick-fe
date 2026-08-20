import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup } from 'solid-js'
import { cn } from '../../lib/utils'
import type { Option } from './select'

/**
 * A filterable listbox, for lists too long to scroll.
 *
 * The timezone picker is the reason it exists. Every scheduler in this category
 * hands you a native dropdown of four hundred IANA names and lets you hunt;
 * this filters as you type and shows the current local time in each zone, so
 * choosing one is a decision you can actually check rather than a guess you
 * find out about tomorrow morning.
 */
export function Combobox(props: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
  class?: string
  invalid?: boolean
}) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [active, setActive] = createSignal(0)
  const listId = createUniqueId()
  let root: HTMLDivElement | undefined
  let field: HTMLInputElement | undefined

  const matches = createMemo(() => {
    const needle = query().trim().toLowerCase()
    if (!needle) return props.options
    return props.options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle),
    )
  })

  const selected = () => props.options.find((option) => option.value === props.value)

  const commit = (value: string) => {
    props.onChange(value)
    setQuery('')
    setOpen(false)
  }

  createEffect(() => {
    if (!open()) return
    const away = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', away)
    onCleanup(() => document.removeEventListener('mousedown', away))
  })

  // Typing narrows the list, so the highlight has to come back to the top or it
  // ends up pointing past the end of what is left.
  createEffect(() => {
    query()
    setActive(0)
  })

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        setOpen(false)
        setQuery('')
        break
      case 'ArrowDown':
        event.preventDefault()
        setActive((i) => Math.min(matches().length - 1, i + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Enter': {
        event.preventDefault()
        const option = matches()[active()]
        if (option) commit(option.value)
        break
      }
    }
  }

  return (
    <div class={cn('relative', props.class)} ref={root}>
      <div
        class={cn(
          'flex h-9 items-center gap-2 rounded border bg-surface-1 px-2.5 transition-colors',
          props.invalid ? 'border-fail' : 'border-border',
          open() && 'border-accent',
        )}
      >
        <input
          ref={field}
          role="combobox"
          aria-expanded={open()}
          aria-controls={listId}
          spellcheck={false}
          autocomplete="off"
          class="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
          value={open() ? query() : (selected()?.label ?? '')}
          placeholder={props.placeholder ?? 'Search…'}
          onFocus={() => setOpen(true)}
          onInput={(e) => {
            setQuery(e.currentTarget.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        <Show when={!open() && selected()?.trailing}>
          <span class="num shrink-0 text-2xs text-muted">{selected()!.trailing}</span>
        </Show>
        <span aria-hidden="true" class="shrink-0 text-2xs text-muted">
          ▾
        </span>
      </div>

      <Show when={open()}>
        <ul
          id={listId}
          role="listbox"
          class="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded border border-border-strong bg-surface-1 py-1 shadow-lg shadow-black/30"
        >
          <Show
            when={matches().length > 0}
            fallback={<li class="px-2.5 py-3 text-center text-2xs text-muted">Nothing matches.</li>}
          >
            <For each={matches()}>
              {(option, index) => (
                <li
                  role="option"
                  aria-selected={option.value === props.value}
                  onMouseEnter={() => setActive(index())}
                  onClick={() => commit(option.value)}
                  class={cn(
                    'flex cursor-pointer items-baseline gap-2 px-2.5 py-1.5',
                    index() === active() && 'bg-surface-2',
                    option.value === props.value && 'text-accent',
                  )}
                >
                  <span class="flex-1 truncate text-sm">{option.label}</span>
                  <Show when={option.trailing}>
                    <span class="num shrink-0 text-2xs text-muted">{option.trailing}</span>
                  </Show>
                </li>
              )}
            </For>
          </Show>
        </ul>
      </Show>
    </div>
  )
}
