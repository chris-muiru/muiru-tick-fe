import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'
import { activeTenantUuid } from '../../lib/session'
import { TICK_QUERY_NAMES, scopedKey } from '../queryKeys'
import {
  createChannel,
  createPolicy,
  deleteChannel,
  deletePolicy,
  fetchChannels,
  fetchDeliveries,
  fetchPolicies,
  fetchWebhookDeliveries,
  testChannel,
} from './trans'

export const useChannelsQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.ALERT_CHANNELS),
    queryFn: fetchChannels,
    enabled: !!activeTenantUuid(),
  }))

export const usePoliciesQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.ESCALATION_POLICIES),
    queryFn: fetchPolicies,
    enabled: !!activeTenantUuid(),
  }))

export const useDeliveriesQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.DELIVERIES),
    queryFn: fetchDeliveries,
    enabled: !!activeTenantUuid(),
  }))

export const useWebhookDeliveriesQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.WEBHOOK_DELIVERIES),
    queryFn: fetchWebhookDeliveries,
    enabled: !!activeTenantUuid(),
  }))

export const useAlertMutations = () => {
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: [activeTenantUuid()] })
  return {
    createChannel: useMutation(() => ({ mutationFn: createChannel, onSuccess: invalidate })),
    deleteChannel: useMutation(() => ({ mutationFn: deleteChannel, onSuccess: invalidate })),
    testChannel: useMutation(() => ({ mutationFn: testChannel })),
    createPolicy: useMutation(() => ({ mutationFn: createPolicy, onSuccess: invalidate })),
    deletePolicy: useMutation(() => ({ mutationFn: deletePolicy, onSuccess: invalidate })),
  }
}
