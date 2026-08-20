import { defineConfig } from '@solidjs/start/config'

export default defineConfig({
  // Client-rendered, deliberately.
  //
  // Every screen in this product is behind auth, and the session lives in
  // localStorage, which the server cannot read — so a server render can only
  // ever produce the signed-out skeleton. Worse, the dashboard's queries are
  // gated on the active tenant, which is null on the server: those resources
  // never settle, the Suspense boundary they sit under never resolves, and the
  // response streams its first 21KB and then hangs open forever. That is a
  // blank page, not a slow one.
  //
  // There is no public route to earn SSR back. muiru-watch keeps it for status
  // pages; tick has none.
  ssr: false,
  server: { preset: 'node-server' },
})
