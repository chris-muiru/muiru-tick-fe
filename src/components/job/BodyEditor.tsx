import { For } from 'solid-js'
import { Textarea } from '../ui/input'
import { Field } from '../ui/field'

/**
 * The variables are an allowlist, and the picker is generated from it. A product
 * that refuses to run customer code must not advertise a placeholder its
 * executor does not substitute, so this list and the server's are the same list.
 */
const VARIABLES = [
  { token: '{{run_id}}', hint: 'unique per attempt' },
  { token: '{{occurrence_id}}', hint: 'stable across retries — your idempotency key' },
  { token: '{{scheduled_time}}', hint: 'the slot this run belongs to' },
  { token: '{{attempt}}', hint: '1, 2, 3…' },
  { token: '{{job_id}}', hint: '' },
  { token: '{{job_name}}', hint: '' },
  { token: '{{now}}', hint: 'when the request is sent' },
]

export function BodyEditor(props: { value: string; onChange: (value: string) => void }) {
  let textarea: HTMLTextAreaElement | undefined

  const insert = (token: string) => {
    const element = textarea
    if (!element) return props.onChange(props.value + token)
    const start = element.selectionStart
    const end = element.selectionEnd
    props.onChange(props.value.slice(0, start) + token + props.value.slice(end))
    queueMicrotask(() => {
      element.focus()
      element.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div class="space-y-2">
      <Field label="Request body" hint="Sent as-is. Variables are substituted at send time.">
        <Textarea
          ref={textarea}
          rows={7}
          spellcheck={false}
          placeholder={'{\n  "runId": "{{run_id}}",\n  "scheduledFor": "{{scheduled_time}}"\n}'}
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
        />
      </Field>
      <div class="flex flex-wrap gap-1">
        <For each={VARIABLES}>
          {(variable) => (
            <button
              type="button"
              title={variable.hint}
              onClick={() => insert(variable.token)}
              class="num rounded border border-border px-1.5 py-0.5 text-2xs text-secondary hover:bg-surface-2 hover:text-primary"
            >
              {variable.token}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
