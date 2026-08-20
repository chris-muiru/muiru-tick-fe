import { defineConfig } from '@solidjs/start/config'

export default defineConfig({
  // The dashboard is client-rendered; SSR exists so the shell and the marketing
  // route paint immediately. Authenticated screens gain nothing from a server
  // render they cannot personalise — the session lives in localStorage.
  ssr: true,
  server: { preset: 'node-server' },
})
