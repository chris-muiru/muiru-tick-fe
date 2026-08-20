import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'
import { activeTenantUuid } from '../../lib/session'
import { TICK_QUERY_NAMES, scopedKey } from '../queryKeys'
import { acknowledgeIncident, deleteIncident, fetchIncidents, resolveIncident } from './trans'

export const useIncidentsQuery = (state: () => string | undefined) =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.INCIDENTS, state()),
    queryFn: () => fetchIncidents(state()),
    enabled: !!activeTenantUuid(),
  }))

export const useIncidentMutations = () => {
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: [activeTenantUuid()] })
  return {
    acknowledge: useMutation(() => ({ mutationFn: acknowledgeIncident, onSuccess: invalidate })),
    resolve: useMutation(() => ({ mutationFn: resolveIncident, onSuccess: invalidate })),
    remove: useMutation(() => ({ mutationFn: deleteIncident, onSuccess: invalidate })),
  }
}
