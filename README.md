# muiru-tick — UI

SolidStart dashboard for muiru-tick. Shares muiru-watch's design system —
dark-first, dense, tabular numbers, one accent, status colour never used for
anything else — with a teal accent and an outcome ramp instead of an up/down
one, so the two products read as siblings rather than the same app.

## Layout

```
src/lib/         transport, session, theme, formatting, the SSE client
src/types/       API shapes
src/resource/    one folder per domain: trans.ts (endpoints) + hook.ts (queries)
src/components/  ui/ primitives, shared/ app-wide, job/ the editor, run/ history
src/routes/      file-based routes
```

Nothing polls. The SSE stream mounted in `Shell` invalidates the query cache;
each screen re-reads only what it subscribes to.

## The cron builder

`components/job/` is where the effort went. The builder is a lens over the cron
string, not a replacement for it — the raw expression is always visible and
always editable, and anything the lens cannot represent falls through to Custom
rather than being silently rewritten.

The preview is computed **on the server**, by the same code the scheduler
evaluates. A client-side cron library would have its own view of DST and its own
idea of which fields are supported, and any disagreement means this screen
confidently shows times the scheduler will not honour.

## Development

```bash
bun install
bun run dev
```

Point `VITE_TICK_API_BASE` at a running backend. Production reads `.env.prod`,
which Vite inlines at build time — see the Jenkinsfile.
