import { For, Show } from 'solid-js'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export type Pair = { name: string; value: string }

/**
 * Secret rows are write-only. On an existing job the API returns the header
 * names with masked values, so an untouched secret row shows dots and is not
 * sent back — retyping every production token to change a timeout would be a
 * reliable way to get them pasted into a chat window instead.
 */
export function KeyValueEditor(props: {
  pairs: Pair[]
  onChange: (pairs: Pair[]) => void
  secret?: boolean
  namePlaceholder?: string
  valuePlaceholder?: string
}) {
  const update = (index: number, partial: Partial<Pair>) =>
    props.onChange(props.pairs.map((pair, i) => (i === index ? { ...pair, ...partial } : pair)))

  return (
    <div class="space-y-1.5">
      <For each={props.pairs}>
        {(pair, index) => (
          <div class="flex items-center gap-1.5">
            <Input
              class="num flex-1"
              placeholder={props.namePlaceholder ?? 'Header'}
              value={pair.name}
              spellcheck={false}
              onInput={(e) => update(index(), { name: e.currentTarget.value })}
            />
            <Input
              class="num flex-1"
              placeholder={props.valuePlaceholder ?? 'Value'}
              value={pair.value}
              spellcheck={false}
              type={props.secret ? 'password' : 'text'}
              onInput={(e) => update(index(), { value: e.currentTarget.value })}
            />
            <button
              type="button"
              aria-label={`Remove ${pair.name || 'header'}`}
              onClick={() => props.onChange(props.pairs.filter((_, i) => i !== index()))}
              class="grid h-9 w-9 shrink-0 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fail"
            >
              ×
            </button>
          </div>
        )}
      </For>
      <Show when={props.pairs.length === 0}>
        <p class="py-1 text-2xs text-muted">None.</p>
      </Show>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => props.onChange([...props.pairs, { name: '', value: '' }])}
      >
        Add {props.secret ? 'secret header' : 'header'}
      </Button>
    </div>
  )
}
