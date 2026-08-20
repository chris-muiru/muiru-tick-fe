import { For, Show, createSignal } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { ListSection } from '../components/shared/Section'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input, Select } from '../components/ui/input'
import {
  useAlertMutations,
  useChannelsQuery,
  useDeliveriesQuery,
  usePoliciesQuery,
  useWebhookDeliveriesQuery,
} from '../resource/alert/hook'
import { duration, relativeTime } from '../lib/format'

export default function Alerting() {
  const channels = useChannelsQuery()
  const policies = usePoliciesQuery()
  const deliveries = useDeliveriesQuery()
  const webhookDeliveries = useWebhookDeliveriesQuery()
  const mutations = useAlertMutations()

  const [channelForm, setChannelForm] = createSignal({ name: '', kind: 'email', target: '' })
  const [policyName, setPolicyName] = createSignal('')
  const [steps, setSteps] = createSignal<{ channelUuid: string; waitSeconds: number }[]>([])
  const [tested, setTested] = createSignal('')

  return (
    <Shell>
      <h1 class="mb-1 text-xl font-medium tracking-tight text-primary">Alerting</h1>
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
          <form
            class="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              mutations.createChannel.mutate(channelForm(), {
                onSuccess: () => setChannelForm({ name: '', kind: 'email', target: '' }),
              })
            }}
          >
            <Input
              required
              placeholder="Name"
              value={channelForm().name}
              onInput={(e) => setChannelForm({ ...channelForm(), name: e.currentTarget.value })}
            />
            <Select
              value={channelForm().kind}
              onChange={(e) => setChannelForm({ ...channelForm(), kind: e.currentTarget.value })}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
            </Select>
            <Input
              required
              class="num"
              placeholder="Destination"
              value={channelForm().target}
              onInput={(e) => setChannelForm({ ...channelForm(), target: e.currentTarget.value })}
            />
            <Button type="submit" loading={mutations.createChannel.isPending}>
              Add
            </Button>
          </form>
        }
      >
        {(channel) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3">
            <Badge variant="neutral">{channel.kind}</Badge>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-primary">{channel.name}</p>
              <p class="num truncate text-2xs text-muted">{channel.target}</p>
            </div>
            <Show when={tested() === channel.uuid}>
              <span class="text-2xs text-ok">sent</span>
            </Show>
            {/* Sending a real notification is the only way to find out whether a
                channel works. Finding out at 3am from a page that never arrived
                is the alternative. */}
            <Button
              size="sm"
              variant="outline"
              loading={mutations.testChannel.isPending}
              onClick={() =>
                mutations.testChannel.mutate(channel.uuid, { onSuccess: () => setTested(channel.uuid) })
              }
            >
              Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => mutations.deleteChannel.mutate(channel.uuid)}
            >
              Remove
            </Button>
          </div>
        )}
      </ListSection>

      <ListSection
        title="Escalation policies"
        description="Ordered steps. If nobody acknowledges within a step's wait, the next one fires."
        rows={policies.data}
        isLoading={policies.isPending}
        error={policies.error as Error | null}
        emptyTitle="No policies yet"
        emptyHint="Without a policy, an incident opens and nobody is told."
        footer={
          <form
            class="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              mutations.createPolicy.mutate(
                { name: policyName(), steps: steps() },
                { onSuccess: () => { setPolicyName(''); setSteps([]) } },
              )
            }}
          >
            <Field label="Policy name">
              <Input
                required
                value={policyName()}
                onInput={(e) => setPolicyName(e.currentTarget.value)}
              />
            </Field>
            <For each={steps()}>
              {(step, index) => (
                <div class="flex gap-2">
                  <Select
                    value={step.channelUuid}
                    onChange={(e) =>
                      setSteps(
                        steps().map((s, i) =>
                          i === index() ? { ...s, channelUuid: e.currentTarget.value } : s,
                        ),
                      )
                    }
                  >
                    <option value="">Choose a channel</option>
                    <For each={channels.data ?? []}>
                      {(channel) => <option value={channel.uuid}>{channel.name}</option>}
                    </For>
                  </Select>
                  <Input
                    type="number"
                    class="num w-32"
                    min={0}
                    value={step.waitSeconds}
                    onInput={(e) =>
                      setSteps(
                        steps().map((s, i) =>
                          i === index() ? { ...s, waitSeconds: Number(e.currentTarget.value || 0) } : s,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    class="px-2 text-muted hover:text-fail"
                    onClick={() => setSteps(steps().filter((_, i) => i !== index()))}
                  >
                    ×
                  </button>
                </div>
              )}
            </For>
            <div class="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSteps([...steps(), { channelUuid: '', waitSeconds: 300 }])}
              >
                Add step
              </Button>
              <Button type="submit" size="sm" disabled={!steps().length} loading={mutations.createPolicy.isPending}>
                Create policy
              </Button>
            </div>
          </form>
        }
      >
        {(policy) => (
          <div class="flex items-center gap-3 px-3.5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-primary">{policy.name}</p>
              <p class="truncate text-2xs text-muted">
                {policy.steps
                  .map((step) => `${step.channelName} → wait ${Math.round(step.waitSeconds / 60)}m`)
                  .join(' · ') || 'no steps'}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => mutations.deletePolicy.mutate(policy.uuid)}>
              Remove
            </Button>
          </div>
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
