import { Show, createEffect, createSignal, onCleanup } from 'solid-js'
import { useIsRouting } from '@solidjs/router'

/**
 * Sits outside Suspense on purpose: a route is a lazy chunk, so until it
 * arrives the page component does not exist yet, and a bar housed inside the
 * shell would only appear once the screen it was announcing had already loaded.
 */
export function RouteProgress() {
  const isRouting = useIsRouting()
  const [visible, setVisible] = createSignal(false)
  let timer: ReturnType<typeof setTimeout>

  createEffect(() => {
    if (isRouting()) {
      // Below ~120ms a progress bar reads as a flicker, not as feedback.
      timer = setTimeout(() => setVisible(true), 120)
    } else {
      clearTimeout(timer)
      setVisible(false)
    }
  })
  onCleanup(() => clearTimeout(timer))

  return (
    <Show when={visible()}>
      <div class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
        <div class="h-full w-1/4 rounded-full bg-accent animate-route-bar" />
      </div>
    </Show>
  )
}
