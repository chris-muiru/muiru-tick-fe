import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'
import { activeTenantUuid } from '../../lib/session'
import { TICK_QUERY_NAMES, scopedKey } from '../queryKeys'
import {
  createCredential,
  deleteCredential,
  fetchCredentials,
  fetchTeam,
  inviteTeammate,
  revokeCredential,
} from './trans'

export const useTeamQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.TEAM),
    queryFn: fetchTeam,
    enabled: !!activeTenantUuid(),
  }))

export const useCredentialsQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.CREDENTIALS),
    queryFn: fetchCredentials,
    enabled: !!activeTenantUuid(),
  }))

export const useAccountMutations = () => {
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: [activeTenantUuid()] })
  return {
    invite: useMutation(() => ({
      mutationFn: (input: { email: string; role: string }) =>
        inviteTeammate(input.email, input.role),
      onSuccess: invalidate,
    })),
    createCredential: useMutation(() => ({ mutationFn: createCredential, onSuccess: invalidate })),
    revokeCredential: useMutation(() => ({ mutationFn: revokeCredential, onSuccess: invalidate })),
    deleteCredential: useMutation(() => ({ mutationFn: deleteCredential, onSuccess: invalidate })),
  }
}

export const useTickInvalidator = () => {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: [activeTenantUuid()] })
}
