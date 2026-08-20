import { A } from '@solidjs/router'
import { For, Show, createSignal } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { ListSection } from '../components/shared/Section'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useIncidentMutations, useIncidentsQuery } from '../resource/incident/hook'
import { relativeTime } from '../lib/format'
import { cn } from '../lib/utils'

const FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

export default function Incidents() {
  const [state, setState] = createSignal<string | undefined>('open')
  const incidents = useIncidentsQuery(state)
  const mutations = useIncidentMutations()

  return (
    <Shell>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-medium tracking-tight text-primary">Incidents</h1>
        <div class="ml-auto flex gap-1">
          <For each={FILTERS}>
            {(filter) => (
              <button
                type="button"
                onClick={() => setState(filter.value)}
                class={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  state() === filter.value
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-secondary hover:bg-surface-2 hover:text-primary',
                )}
              >
                {filter.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <ListSection
        title="Incidents"
        description="An incident opens when a job crosses its consecutive-failure threshold, or when we start a run later than its lateness budget allows."
        rows={incidents.data}
        isLoading={incidents.isPending}
        error={incidents.error as Error | null}
        onRefetch={() => incidents.refetch()}
        emptyTitle="Nothing open"
        emptyHint="Jobs are firing and their endpoints are answering."
      >
        {(incident) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3">
            <Badge variant={incident.kind === 'late' ? 'late' : 'fail'}>
              {incident.kind === 'late' ? 'Late' : 'Failing'}
            </Badge>
            <div class="min-w-0 flex-1">
              <A
                href={`/jobs/${incident.jobUuid}`}
                class="block truncate text-sm text-primary hover:text-accent"
              >
                {incident.jobName}
              </A>
              <p class="break-anywhere text-2xs text-muted">{incident.cause}</p>
            </div>

            <Show when={!incident.escalating && incident.state !== 'resolved'}>
              {/* Says so rather than leaving a silence to be discovered later. */}
              <span class="text-2xs text-late" title="The escalation workflow has not started yet">
                not escalating
              </span>
            </Show>

            <span class="num shrink-0 text-2xs text-muted">{relativeTime(incident.startedAt)}</span>

            <Show when={incident.state === 'open'}>
              <Button
                size="sm"
                variant="outline"
                loading={mutations.acknowledge.isPending}
                onClick={() => mutations.acknowledge.mutate(incident.uuid)}
              >
                Acknowledge
              </Button>
            </Show>
            <Show when={incident.state !== 'resolved'}>
              <Button
                size="sm"
                variant="ghost"
                loading={mutations.resolve.isPending}
                onClick={() => mutations.resolve.mutate(incident.uuid)}
              >
                Resolve
              </Button>
            </Show>
            <Show when={incident.state === 'resolved'}>
              <Badge variant="ok">Resolved</Badge>
            </Show>
          </div>
        )}
      </ListSection>
    </Shell>
  )
}
