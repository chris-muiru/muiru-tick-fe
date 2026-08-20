import { ErrorBoundary, type JSX } from 'solid-js'
import { log } from '../../lib/logger'

export function AppErrorBoundary(props: { children: JSX.Element }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        log.ui.error('unhandled render error', error)
        return (
          <div class="grid min-h-screen place-items-center bg-surface-0 px-5">
            <div class="w-full max-w-md rounded-lg border border-border bg-surface-1 p-5">
              <p class="text-sm font-medium text-primary">This screen stopped working.</p>
              <p class="mt-1 text-xs text-secondary">
                Your jobs are unaffected — scheduling runs on the server, not in this tab.
              </p>
              <pre class="break-anywhere mt-3 rounded border border-border bg-surface-2 p-2 text-2xs text-muted">
                {String(error?.message ?? error)}
              </pre>
              <button
                onClick={reset}
                class="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
              >
                Try again
              </button>
            </div>
          </div>
        )
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
