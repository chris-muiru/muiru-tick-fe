import { For, Show, createMemo } from 'solid-js'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Combobox } from '../ui/combobox'
import { Field } from '../ui/field'
import { cn } from '../../lib/utils'
import { timezoneOptions } from '../../lib/format'
import { PRESETS, WEEKDAY_LABELS, fromCron, toCron, type Pattern } from './cronPattern'

export type ScheduleValue = {
  kind: 'cron' | 'interval'
  cronExpr: string
  intervalSeconds: number
  timezone: string
}

/**
 * The builder is a lens, not the source of truth. Cron stays the stored format
 * and the raw field is always visible and always editable — a scheduler whose UI
 * hides the expression teaches its users nothing and traps the ones who already
 * know what they want.
 */
const REPEAT_OPTIONS = [
  { value: 'everyMinutes', label: 'Every N minutes' },
  { value: 'everyHours', label: 'Every N hours' },
  { value: 'daily', label: 'Every day', hint: 'One wall-clock time, every day.' },
  { value: 'weekdays', label: 'Every weekday', hint: 'Monday to Friday.' },
  { value: 'weekly', label: 'Certain days of the week' },
  { value: 'monthly', label: 'Once a month', hint: 'Months without that day are skipped.' },
  { value: 'custom', label: 'Custom expression', hint: 'Write the five fields yourself.' },
]

const numberOptions = (values: number[], unit: string) =>
  values.map((n) => ({ value: String(n), label: n === 1 ? `every ${unit}` : `${n} ${unit}s` }))

const padded = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }))

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

export function CronBuilder(props: {
  value: ScheduleValue
  onChange: (next: ScheduleValue) => void
}) {
  const pattern = createMemo(() => fromCron(props.value.cronExpr))
  // Built once per mount: four hundred zones formatted on every keystroke would
  // be felt, and a minute of drift in the displayed time does not matter.
  const zones = createMemo(() => timezoneOptions())
  const set = (partial: Partial<ScheduleValue>) => props.onChange({ ...props.value, ...partial })
  const setPattern = (next: Pattern) => set({ cronExpr: toCron(next) })

  return (
    <div class="space-y-4">
      <div class="inline-flex rounded border border-border p-0.5">
        <For
          each={[
            { kind: 'cron' as const, label: 'Cron' },
            { kind: 'interval' as const, label: 'Interval' },
          ]}
        >
          {(option) => (
            <button
              type="button"
              onClick={() => set({ kind: option.kind })}
              class={cn(
                'rounded px-3 py-1 text-xs font-medium transition-colors',
                props.value.kind === option.kind
                  ? 'bg-accent text-accent-fg'
                  : 'text-secondary hover:text-primary',
              )}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>

      <Show when={props.value.kind === 'interval'}>
        <IntervalFields
          seconds={props.value.intervalSeconds}
          onChange={(intervalSeconds) => set({ intervalSeconds })}
        />
        <p class="text-2xs text-muted">
          An interval counts from the previous run, so it never consults a calendar
          and a daylight-saving change cannot move it.
        </p>
      </Show>

      <Show when={props.value.kind === 'cron'}>
        <div>
          <p class="mb-1.5 text-xs font-medium text-secondary">Common schedules</p>
          <div class="flex flex-wrap gap-1.5">
            <For each={PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => set({ cronExpr: preset.expr })}
                  class={cn(
                    'rounded border px-2 py-1 text-2xs transition-colors',
                    props.value.cronExpr === preset.expr
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-secondary hover:bg-surface-2 hover:text-primary',
                  )}
                >
                  {preset.label}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <Field label="Repeats">
            <Select
              value={pattern().kind}
              options={REPEAT_OPTIONS}
              onChange={(value) => setPattern(defaultFor(value as Pattern['kind'], props.value.cronExpr))}
            />
          </Field>

          <PatternFields pattern={pattern()} onChange={setPattern} />
        </div>

        <Field
          label="Cron expression"
          hint="Five fields: minute, hour, day of month, month, day of week. Editing this switches the builder to Custom."
        >
          <Input
            class="num"
            value={props.value.cronExpr}
            spellcheck={false}
            autocapitalize="off"
            autocomplete="off"
            onInput={(e) => set({ cronExpr: e.currentTarget.value })}
          />
        </Field>
      </Show>

      <Field
        label="Timezone"
        hint="Cron is evaluated here, not in server time. Each zone shows the time it is there right now."
      >
        <Combobox
          value={props.value.timezone}
          options={zones()}
          placeholder="Search zones…"
          onChange={(timezone) => set({ timezone })}
        />
      </Field>
    </div>
  )
}

function PatternFields(props: { pattern: Pattern; onChange: (next: Pattern) => void }) {
  return (
    <>
      <Show when={props.pattern.kind === 'everyMinutes' && props.pattern}>
        {(p) => (
          <Field label="Minutes between runs">
            <Select
              value={String(p().minutes)}
              options={numberOptions([1, 2, 5, 10, 15, 20, 30], 'minute')}
              onChange={(value) => props.onChange({ kind: 'everyMinutes', minutes: Number(value) })}
            />
          </Field>
        )}
      </Show>

      <Show when={props.pattern.kind === 'everyHours' && props.pattern}>
        {(p) => (
          <div class="grid grid-cols-2 gap-3">
            <Field label="Hours between">
              <Select
                value={String(p().hours)}
                options={numberOptions([1, 2, 3, 4, 6, 8, 12], 'hour')}
                onChange={(value) =>
                  props.onChange({ kind: 'everyHours', hours: Number(value), minute: p().minute })
                }
              />
            </Field>
            <Field label="At minute">
              <MinuteSelect
                value={p().minute}
                onChange={(minute) => props.onChange({ kind: 'everyHours', hours: p().hours, minute })}
              />
            </Field>
          </div>
        )}
      </Show>

      <Show when={(props.pattern.kind === 'daily' || props.pattern.kind === 'weekdays') && props.pattern}>
        {(p) => (
          <Field label="At">
            <TimeOfDay
              hour={(p() as { hour: number }).hour}
              minute={(p() as { minute: number }).minute}
              onChange={(hour, minute) => props.onChange({ ...(p() as Pattern), hour, minute } as Pattern)}
            />
          </Field>
        )}
      </Show>

      <Show when={props.pattern.kind === 'weekly' && props.pattern}>
        {(p) => (
          <div class="space-y-3">
            <Field label="At">
              <TimeOfDay
                hour={p().hour}
                minute={p().minute}
                onChange={(hour, minute) => props.onChange({ ...p(), hour, minute })}
              />
            </Field>
            <div>
              <span class="mb-1 block text-xs font-medium text-secondary">On</span>
              <div class="flex flex-wrap gap-1">
                <For each={WEEKDAY_LABELS}>
                  {(label, index) => {
                    const selected = () => p().days.includes(index())
                    return (
                      <button
                        type="button"
                        aria-pressed={selected()}
                        onClick={() => {
                          const days = selected()
                            ? p().days.filter((d) => d !== index())
                            : [...p().days, index()]
                          props.onChange({ ...p(), days: days.length ? days : [index()] })
                        }}
                        class={cn(
                          'h-8 w-11 rounded border text-2xs font-medium transition-colors',
                          selected()
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-secondary hover:bg-surface-2',
                        )}
                      >
                        {label}
                      </button>
                    )
                  }}
                </For>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={props.pattern.kind === 'monthly' && props.pattern}>
        {(p) => (
          <div class="grid grid-cols-2 gap-3">
            <Field label="Day of month" hint="Months without this day are skipped.">
              <Select
                value={String(p().day)}
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1),
                  label: ordinal(i + 1),
                }))}
                onChange={(value) => props.onChange({ ...p(), day: Number(value) })}
              />
            </Field>
            <Field label="At">
              <TimeOfDay
                hour={p().hour}
                minute={p().minute}
                onChange={(hour, minute) => props.onChange({ ...p(), hour, minute })}
              />
            </Field>
          </div>
        )}
      </Show>

      <Show when={props.pattern.kind === 'custom'}>
        <div class="self-end text-2xs leading-relaxed text-muted">
          Edit the expression below. The preview is generated by the scheduler itself,
          so whatever it shows is exactly what will happen.
        </div>
      </Show>
    </>
  )
}

function TimeOfDay(props: { hour: number; minute: number; onChange: (hour: number, minute: number) => void }) {
  return (
    <div class="flex items-center gap-1.5">
      <Select
        class="w-[86px]"
        value={String(props.hour)}
        options={padded(24)}
        onChange={(value) => props.onChange(Number(value), props.minute)}
      />
      <span class="text-muted">:</span>
      <MinuteSelect value={props.minute} onChange={(minute) => props.onChange(props.hour, minute)} />
    </div>
  )
}

function MinuteSelect(props: { value: number; onChange: (minute: number) => void }) {
  return (
    <Select
      class="w-[86px]"
      value={String(props.value)}
      options={padded(60)}
      onChange={(value) => props.onChange(Number(value))}
    />
  )
}

function IntervalFields(props: { seconds: number; onChange: (seconds: number) => void }) {
  const unit = () => (props.seconds % 86400 === 0 ? 86400 : props.seconds % 3600 === 0 ? 3600 : 60)
  const amount = () => Math.max(1, Math.round(props.seconds / unit()))

  return (
    <div class="grid grid-cols-2 gap-3">
      <Field label="Run every" hint="The shortest supported interval is 60 seconds.">
        <Input
          type="number"
          min={1}
          class="num"
          value={amount()}
          onInput={(e) => props.onChange(Math.max(60, Number(e.currentTarget.value || 1) * unit()))}
        />
      </Field>
      <Field label="Unit">
        <Select
          value={String(unit())}
          options={[
            { value: '60', label: 'minutes' },
            { value: '3600', label: 'hours' },
            { value: '86400', label: 'days' },
          ]}
          onChange={(value) => props.onChange(Math.max(60, amount() * Number(value)))}
        />
      </Field>
    </div>
  )
}

/** Switching pattern keeps the time of day where the previous one had one. */
function defaultFor(kind: Pattern['kind'], currentExpr: string): Pattern {
  const current = fromCron(currentExpr)
  const hour = 'hour' in current ? current.hour : 9
  const minute = 'minute' in current ? current.minute : 0
  switch (kind) {
    case 'everyMinutes':
      return { kind, minutes: 5 }
    case 'everyHours':
      return { kind, hours: 1, minute }
    case 'daily':
      return { kind, hour, minute }
    case 'weekdays':
      return { kind, hour, minute }
    case 'weekly':
      return { kind, days: [1], hour, minute }
    case 'monthly':
      return { kind, day: 1, hour, minute }
    case 'custom':
      return { kind, expr: currentExpr }
  }
}
