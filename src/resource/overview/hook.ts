import { useQuery } from '@tanstack/solid-query'
import { activeTenantUuid } from '../../lib/session'
import { TICK_QUERY_NAMES, scopedKey } from '../queryKeys'
import { fetchOverview } from './trans'

export const useOverviewQuery = () =>
  useQuery(() => ({
    queryKey: scopedKey(TICK_QUERY_NAMES.OVERVIEW),
    queryFn: fetchOverview,
    enabled: !!activeTenantUuid(),
    // The event stream invalidates on change; this only covers the gap between
    // a run finishing and its event arriving.
    staleTime: 5_000,
  }))
