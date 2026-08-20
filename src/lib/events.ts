import { onCleanup } from 'solid-js'
import { API_BASE } from './http'
import { session } from './session'
import { log } from './logger'

export type TickEvent = {
  event: 'run.started' | 'run.finished' | 'run.skipped' | 'incident.opened' | 'incident.resolved'
  payload: Record<string, unknown>
}

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'

/**
 * Subscribes to the server's event stream.
 *
 * EventSource cannot set an Authorization header, and the alternative — putting
 * the JWT in the query string — writes a credential into every access log and
 * proxy trace it passes through. So the stream is read over fetch instead,
 * which keeps the token in a header where it belongs.
 */
export function subscribeToEvents(
  onEvent: (event: TickEvent) => void,
  onState?: (state: ConnectionState) => void,
) {
  const controller = new AbortController()
  let reconnectDelayMs = 1000

  const connect = async () => {
    const current = session()
    if (!current || controller.signal.aborted) return

    try {
      const response = await fetch(`${API_BASE}/events`, {
        headers: {
          Authorization: `Bearer ${current.token}`,
          'X-Tenant': current.activeTenantUuid,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error(`stream failed: ${response.status}`)

      reconnectDelayMs = 1000
      onState?.('live')
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value

        // SSE frames are separated by a blank line; anything before the last
        // one is complete and safe to parse.
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const dataLine = frame.split('\n').find((line) => line.startsWith('data: '))
          if (dataLine) {
            try {
              onEvent(JSON.parse(dataLine.slice(6)) as TickEvent)
            } catch {
              // A malformed frame is not worth tearing the stream down for.
            }
          }
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) log.events.warn('event stream dropped', error)
    }

    if (controller.signal.aborted) return
    // A dropped stream has to be visible. A dashboard that silently stops
    // updating is worse than one that says it is offline, because it still
    // looks like it is working.
    onState?.('reconnecting')
    setTimeout(connect, reconnectDelayMs)
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000)
  }

  onState?.('connecting')
  void connect()
  onCleanup(() => controller.abort())
}
