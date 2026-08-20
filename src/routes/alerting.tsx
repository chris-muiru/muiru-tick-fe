import { For, Show, createSignal } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { ListSection } from '../components/shared/Section'
import { ConfirmButton } from '../components/shared/ConfirmButton'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import {
  useAlertMutations,
  useChannelsQuery,
  useDeliveriesQuery,
  usePoliciesQuery,
  useWebhookDeliveriesQuery,
} from '../resource/alert/hook'
import { useZodForm } from '../lib/useZodForm'
import { channelSchema, policySchema } from '../schemas/alert'
import { duration, relativeTime } from '../lib/format'
import type { AlertChannel, EscalationPolicy } from '../types'

const KINDS = [
  { value: 'email', label: 'Email', hint: 'An address.' },
  { value: 'sms', label: 'SMS', hint: 'An international number, e.g. +254712345678.' },
  { value: 'slack', label: 'Slack', hint: 'An incoming webhook URL.' },
  { value: 'webhook', label: 'Webhook', hint: 'Any URL that accepts a POST.' },
]

const emptyChannel = () => ({ name: '', kind: 'email', target: '' })

export default function Alerting() {
  const channels = useChannelsQuery()
  const policies = usePoliciesQuery()
  const deliveries = useDeliveriesQuery()
  const webhookDeliveries = useWebhookDeliveriesQuery()
  const mutations = useAlertMutations()

  const [editingChannel, setEditingChannel] = createSignal<string | null>(null)
  const [editingPolicy, setEditingPolicy] = createSignal<string | null>(null)
  const [tested, setTested] = createSignal('')

  return (
    <Shell>
      <h1 class="mb-1 text-lg font-medium tracking-tight text-primary">Alerting</h1>
      <p class="mb-5 text-xs text-secondary">
        Delivery goes through uNotifier, so muiru-tick holds a destination and a template —
        never a provider credential.
      </p>

      <ListSection
        title="Channels"
        rows={channels.data}
        isLoading={channels.isPending}
        error={channels.error as Error | null}
        emptyTitle="No channels yet"
        emptyHint="A channel is where an alert goes: an address, a number, a Slack target or a URL."
        footer={
          <ChannelForm
            submitLabel="Add channel"
            pending={mutations.createChannel.isPending}
            onSubmit={(values, done) =>
              mutations.createChannel.mutate(values, { onSuccess: done })
            }
          />
        }
      >
        {(channel) => (
          <Show
            when={editingChannel() === channel.uuid}
            fallback={
              <ChannelRow
                channel={channel}
                tested={tested() === channel.uuid}
                testing={mutations.testChannel.isPending}
                deleting={mutations.deleteChannel.isPending}
                onEdit={() => setEditingChannel(channel.uuid)}
                onTest={() =>
                  mutations.testChannel.mutate(channel.uuid, {
                    onSuccess: () => setTested(channel.uuid),
                  })
                }
                onDelete={() => mutations.deleteChannel.mutate(channel.uuid)}
              />
            }
          >
            <div class="bg-surface-2/40 px-3.5 py-3">
              <ChannelForm
                initial={{ name: channel.name, kind: channel.kind, target: channel.target }}
                submitLabel="Save"
                pending={mutations.updateChannel.isPending}
                onCancel={() => setEditingChannel(null)}
                onSubmit={(values) =>
                  mutations.updateChannel.mutate(
                    { uuid: channel.uuid, body: values },
                    { onSuccess: () => setEditingChannel(null) },
                  )
                }
              />
            </div>
          </Show>
        )}
      </ListSection>

      <ListSection
        title="Escalation policies"
        description="Ordered steps. If nobody acknowledges within a step's wait, the next one fires. A policy edited now does not re-route an escalation already in flight."
        rows={policies.data}
        isLoading={policies.isPending}
        error={policies.error as Error | null}
        emptyTitle="No policies yet"
        emptyHint="Without a policy, an incident opens and nobody is told."
        footer={
          <PolicyForm
            channels={channels.data ?? []}
            submitLabel="Create policy"
            pending={mutations.createPolicy.isPending}
            onSubmit={(values, done) => mutations.createPolicy.mutate(values, { onSuccess: done })}
          />
        }
      >
        {(policy) => (
          <Show
            when={editingPolicy() === policy.uuid}
            fallback={
              <div class="flex items-center gap-3 px-3.5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-primary">{policy.name}</p>
                  <p class="truncate text-2xs text-muted">
                    {policy.steps
                      .map(
                        (step) =>
                          `${step.channelName} → wait ${Math.round(step.waitSeconds / 60)}m`,
                      )
                      .join(' · ') || 'no steps'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingPolicy(policy.uuid)}>
                  Edit
                </Button>
                <ConfirmButton
                  label="Remove"
                  confirmLabel="Remove"
                  question="Jobs using it fall back to no escalation."
                  pending={mutations.deletePolicy.isPending}
                  onConfirm={() => mutations.deletePolicy.mutate(policy.uuid)}
                />
              </div>
            }
          >
            <div class="bg-surface-2/40 px-3.5 py-3">
              <PolicyForm
                channels={channels.data ?? []}
                initial={policy}
                submitLabel="Save policy"
                pending={mutations.replacePolicy.isPending}
                onCancel={() => setEditingPolicy(null)}
                onSubmit={(values) =>
                  mutations.replacePolicy.mutate(
                    { uuid: policy.uuid, body: values },
                    { onSuccess: () => setEditingPolicy(null) },
                  )
                }
              />
            </div>
          </Show>
        )}
      </ListSection>

      <ListSection
        title="Recent alert deliveries"
        description='So "did the page actually go out?" is answerable here rather than only in the logs.'
        rows={deliveries.data}
        isLoading={deliveries.isPending}
        emptyTitle="Nothing sent yet"
        emptyHint="Alerts appear here the moment one is attempted, sent or failed."
      >
        {(delivery) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
            <Badge variant={delivery.status === 'sent' ? 'ok' : 'fail'}>{delivery.status}</Badge>
            <span class="num truncate text-xs text-primary">{delivery.target}</span>
            <span class="truncate text-2xs text-muted">{delivery.jobName}</span>
            <span class="num ml-auto shrink-0 text-2xs text-muted">
              attempt {delivery.attempt} · {duration(delivery.durationMs)} ·{' '}
              {relativeTime(delivery.attemptedAt)}
            </span>
          </div>
        )}
      </ListSection>

      <ListSection
        title="Completion webhooks"
        rows={webhookDeliveries.data}
        isLoading={webhookDeliveries.isPending}
        emptyTitle="No callbacks yet"
        emptyHint="Add a completion webhook to a job to have run outcomes pushed to you."
      >
        {(delivery) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
            <Badge variant={delivery.status === 'sent' ? 'ok' : 'fail'}>
              {delivery.statusCode ?? delivery.status}
            </Badge>
            <span class="num truncate text-xs text-primary">{delivery.url}</span>
            <span class="text-2xs text-muted">{delivery.event}</span>
            <span class="num ml-auto shrink-0 text-2xs text-muted">
              attempt {delivery.attempt} · {relativeTime(delivery.attemptedAt)}
            </span>
          </div>
        )}
      </ListSection>
    </Shell>
  )
}

function ChannelRow(props: {
  channel: AlertChannel
  tested: boolean
  testing: boolean
  deleting: boolean
  onEdit: () => void
  onTest: () => void
  onDelete: () => void
}) {
  return (
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3">
      <Badge variant="neutral">{props.channel.kind}</Badge>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm text-primary">{props.channel.name}</p>
        <p class="num truncate text-2xs text-muted">{props.channel.target}</p>
      </div>
      <Show when={props.tested}>
        <span class="text-2xs text-ok">sent</span>
      </Show>
      <Button size="sm" variant="outline" onClick={props.onEdit}>
        Edit
      </Button>
      {/* Sending a real notification is the only way to find out whether a
          channel is configured correctly. Finding out at 3am, from a page that
          never arrived, is the alternative. */}
      <Button size="sm" variant="outline" loading={props.testing} onClick={props.onTest}>
        Test
      </Button>
      <ConfirmButton
        label="Remove"
        confirmLabel="Remove"
        pending={props.deleting}
        onConfirm={props.onDelete}
      />
    </div>
  )
}

function ChannelForm(props: {
  initial?: { name: string; kind: string; target: string }
  submitLabel: string
  pending?: boolean
  onCancel?: () => void
  onSubmit: (values: { name: string; kind: string; target: string }, done: () => void) => void
}) {
  const [values, setValues] = createSignal(props.initial ?? emptyChannel())
  const validation = useZodForm(channelSchema)
  const set = (patch: Partial<ReturnType<typeof values>>) => setValues({ ...values(), ...patch })

  return (
    <form
      class="grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = validation.validateAll(values() as never)
        if (!parsed) return
        props.onSubmit(values(), () => setValues(emptyChannel()))
      }}
    >
      <Field label="Name" error={validation.errors().name}>
        <Input
          placeholder="On-call email"
          value={values().name}
          onInput={(e) => {
            set({ name: e.currentTarget.value })
            validation.clearField('name')
          }}
        />
      </Field>
      <Field label="Kind">
        <Select
          value={values().kind}
          options={KINDS}
          onChange={(kind) => {
            set({ kind })
            validation.clearField('target')
          }}
        />
      </Field>
      <Field label="Destination" error={validation.errors().target}>
        <Input
          class="num"
          placeholder={values().kind === 'email' ? 'alerts@example.com' : 'https://…'}
          value={values().target}
          onInput={(e) => {
            set({ target: e.currentTarget.value })
            validation.clearField('target')
          }}
        />
      </Field>
      <div class="flex items-end gap-2">
        <Button type="submit" loading={props.pending}>
          {props.submitLabel}
        </Button>
        <Show when={props.onCancel}>
          <Button type="button" variant="ghost" onClick={() => props.onCancel!()}>
            Cancel
          </Button>
        </Show>
      </div>
    </form>
  )
}

function PolicyForm(props: {
  channels: AlertChannel[]
  initial?: EscalationPolicy
  submitLabel: string
  pending?: boolean
  onCancel?: () => void
  onSubmit: (
    values: { name: string; steps: { channelUuid: string; waitSeconds: number }[] },
    done: () => void,
  ) => void
}) {
  const [name, setName] = createSignal(props.initial?.name ?? '')
  const [steps, setSteps] = createSignal(
    props.initial?.steps.map((step) => ({
      channelUuid: step.channelUuid,
      waitSeconds: step.waitSeconds,
    })) ?? [],
  )
  const validation = useZodForm(policySchema)

  const channelOptions = () =>
    props.channels.map((channel) => ({
      value: channel.uuid,
      label: channel.name,
      hint: `${channel.kind} · ${channel.target}`,
    }))

  const reset = () => {
    setName('')
    setSteps([])
  }

  return (
    <form
      class="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!validation.validateAll({ name: name(), steps: steps() } as never)) return
        props.onSubmit({ name: name(), steps: steps() }, reset)
      }}
    >
      <Field label="Policy name" error={validation.errors().name}>
        <Input
          value={name()}
          placeholder="Page the on-call, then the team"
          onInput={(e) => {
            setName(e.currentTarget.value)
            validation.clearField('name')
          }}
        />
      </Field>

      <For each={steps()}>
        {(step, index) => (
          <div class="flex items-end gap-2">
            <span class="num pb-2.5 text-2xs text-muted">{index() + 1}</span>
            <div class="min-w-0 flex-1">
              <Select
                value={step.channelUuid}
                placeholder="Choose a channel"
                options={channelOptions()}
                onChange={(channelUuid) => {
                  setSteps(steps().map((s, i) => (i === index() ? { ...s, channelUuid } : s)))
                  validation.clearField('steps')
                }}
              />
            </div>
            <div class="w-36">
              <Select
                value={String(step.waitSeconds)}
                options={WAITS}
                onChange={(value) =>
                  setSteps(
                    steps().map((s, i) =>
                      i === index() ? { ...s, waitSeconds: Number(value) } : s,
                    ),
                  )
                }
              />
            </div>
            <button
              type="button"
              aria-label={`Remove step ${index() + 1}`}
              class="grid h-9 w-9 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fail"
              onClick={() => setSteps(steps().filter((_, i) => i !== index()))}
            >
              ×
            </button>
          </div>
        )}
      </For>

      <Show when={validation.errors().steps}>
        <p class="text-2xs text-fail">{validation.errors().steps}</p>
      </Show>

      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSteps([...steps(), { channelUuid: '', waitSeconds: 300 }])}
        >
          Add step
        </Button>
        <Button type="submit" size="sm" loading={props.pending}>
          {props.submitLabel}
        </Button>
        <Show when={props.onCancel}>
          <Button type="button" size="sm" variant="ghost" onClick={() => props.onCancel!()}>
            Cancel
          </Button>
        </Show>
      </div>
    </form>
  )
}

const WAITS = [0, 60, 300, 600, 900, 1800, 3600].map((seconds) => ({
  value: String(seconds),
  label: seconds === 0 ? 'then immediately' : `then wait ${seconds / 60}m`,
}))
