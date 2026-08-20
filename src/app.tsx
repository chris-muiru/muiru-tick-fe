import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Suspense } from 'solid-js'
import { AppErrorBoundary } from './components/shared/AppErrorBoundary'
import { RouteProgress } from './components/shared/RouteProgress'
import { SectionsSkeleton } from './components/shared/PageSkeleton'
import { log } from './lib/logger'
import './styles/globals.css'

// Every failed fetch is logged once, centrally. Without this a query that fails
// only renders an error state somewhere and leaves no trace to debug.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log.api.error('query failed', { key: query.queryKey, message: (error as Error).message })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => log.api.error('mutation failed', { message: (error as Error).message }),
  }),
  defaultOptions: {
    queries: {
      // The SSE stream invalidates on change, so nothing polls. A short stale
      // window still covers navigation between screens.
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router
        root={(props) => (
          <AppErrorBoundary>
            {/* Both sit outside Suspense: a route is a lazy chunk, so until it
                arrives the page component does not exist, and a bar rendered
                inside would only appear once the screen had already loaded. */}
            <RouteProgress />
            <Suspense fallback={<SectionsSkeleton />}>{props.children}</Suspense>
          </AppErrorBoundary>
        )}
      >
        <FileRoutes />
      </Router>
    </QueryClientProvider>
  )
}
