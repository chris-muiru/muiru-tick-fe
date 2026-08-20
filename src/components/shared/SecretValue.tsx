import { Show, createSignal } from 'solid-js'

/**
 * Shown once, copied once. Revealing is deliberate rather than default, because
 * these screens get shared in calls more often than anyone admits.
 */
export function SecretValue(props: { value: string; label?: string }) {
  const [revealed, setRevealed] = createSignal(false)
  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    await navigator.clipboard.writeText(props.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div class="flex items-center gap-2">
      <code class="break-anywhere num min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 py-1 text-2xs text-primary">
        <Show when={revealed()} fallback={'•'.repeat(Math.min(props.value.length, 40))}>
          {props.value}
        </Show>
      </code>
      <button
        onClick={() => setRevealed(!revealed())}
        class="rounded border border-border px-2 py-1 text-2xs text-secondary hover:bg-surface-2"
      >
        {revealed() ? 'Hide' : 'Reveal'}
      </button>
      <button
        onClick={copy}
        class="rounded border border-border px-2 py-1 text-2xs text-secondary hover:bg-surface-2"
      >
        {copied() ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
