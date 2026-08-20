import { http } from '../../lib/http'
import type { Overview } from '../../types'

export const fetchOverview = () => http.get<Overview>('/overview')
