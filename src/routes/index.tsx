import { A, useNavigate } from '@solidjs/router'
import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { session } from '../lib/session'
import { ThemeToggle } from '../components/shared/ThemeToggle'

export default function Landing() {
  const navigate = useNavigate()
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))

  // Signed-in visitors are not here to read the pitch.
  createEffect(() => {
    if (mounted() && session()) navigate('/dashboard', { replace: true })
  })

  return (
    <div class="min-h-screen bg-surface-0">
      <header class="sticky top-0 z-20 border-b border-border bg-surface-0/85 backdrop-blur-sm">
        <div class="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5">
          <span class="grid h-6 w-6 place-items-center rounded-sm bg-accent text-xs font-bold text-accent-fg">
            ◷
          </span>
          <span class="text-sm font-semibold tracking-tight text-primary">muiru-tick</span>
          <nav class="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <A
              href="/login"
              class="rounded px-3 py-1.5 text-xs text-secondary hover:bg-surface-2 hover:text-primary"
            >
              Sign in
            </A>
            <A
              href="/signup"
              class="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
            >
              Start scheduling
            </A>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-5">
        <section class="py-16 sm:py-24">
          <p class="num text-2xs uppercase tracking-[0.2em] text-accent">Scheduler as a service</p>
          <h1 class="mt-4 max-w-3xl text-3xl font-medium leading-[1.15] tracking-tight text-primary sm:text-[2.75rem]">
            Cron you don't have to run yourself.
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-relaxed text-secondary">
            Give us a schedule and a URL. We call your endpoint on time, retry it when it
            fails, and keep a record of every attempt. Your server doesn't need a cron
            daemon, doesn't need to be always on, and doesn't need to implement backoff.
          </p>
          <div class="mt-7 flex flex-wrap items-center gap-3">
            <A
              href="/signup"
              class="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Create a job
            </A>
            <A
              href="/login"
              class="rounded border border-border px-4 py-2 text-sm text-secondary hover:bg-surface-2 hover:text-primary"
            >
              Sign in
            </A>
          </div>

          <HeroTimeline />
        </section>

        <Section
          eyebrow="The honest version"
          title="At most one trigger per slot. At least one delivery per trigger."
        >
          <p class="max-w-2xl text-sm leading-relaxed text-secondary">
            If our process dies after your endpoint received the request but before we
            recorded your response, we will call you again. Nobody can promise more than
            that over an unreliable network, and a scheduler that implies otherwise is
            wrong about its own failure modes.
          </p>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            So every request carries an idempotency key scoped to the{' '}
            <em class="text-primary not-italic">slot</em>, not the attempt — all three
            retries of the 09:00 run send the same key. Dedupe on it and duplicates stop
            being your problem.
          </p>
        </Section>

        <Section eyebrow="Why this one" title="Three things the category gets wrong.">
          <div class="grid gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-3">
            <For each={PILLARS}>
              {(pillar) => (
                <div class="bg-surface-1 p-5">
                  <p class="text-sm font-medium text-primary">{pillar.title}</p>
                  <p class="mt-2 text-xs leading-relaxed text-secondary">{pillar.body}</p>
                </div>
              )}
            </For>
          </div>
        </Section>

        <Section eyebrow="How it works" title="Three steps, then it is somebody else's problem.">
          <ol class="grid gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-3">
            <For each={STEPS}>
              {(step, index) => (
                <li class="bg-surface-1 p-5">
                  <span class="num text-2xs text-accent">0{index() + 1}</span>
                  <p class="mt-2 text-sm font-medium text-primary">{step.title}</p>
                  <p class="mt-1.5 text-xs leading-relaxed text-secondary">{step.body}</p>
                </li>
              )}
            </For>
          </ol>
        </Section>

        <Section eyebrow="Verify us" title="Your endpoint should not trust anyone who calls it.">
          <p class="max-w-2xl text-sm leading-relaxed text-secondary">
            Creating a job turns your endpoint into a URL that fires on a schedule. Every
            request is signed with that job's own secret, timestamp inside the signature,
            so a captured request cannot be replayed later.
          </p>
          <pre class="num mt-4 overflow-x-auto rounded border border-border bg-surface-1 p-4 text-[11px] leading-relaxed text-secondary">
{`POST /jobs/nightly-invoices
X-Tick-Idempotency-Key: 6e21a9f4-…   ← same for every retry of one slot
X-Tick-Run-Id:          1b7d44c0-…   ← unique per attempt
X-Tick-Attempt:         2
X-Tick-Scheduled-For:   2026-08-20T09:00:00Z
X-Tick-Signature:       t=1755680400,v1=9c1f…

  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write([]byte(timestamp + "." + string(body)))
  hmac.Equal(sig, mac.Sum(nil))`}
          </pre>
        </Section>

        <Section eyebrow="Compared" title="Against what else is on the market.">
          <div class="overflow-x-auto rounded border border-border">
            <table class="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr class="border-b border-border bg-surface-2 text-2xs uppercase tracking-wide text-muted">
                  <th class="px-3 py-2 font-medium">&nbsp;</th>
                  <th class="px-3 py-2 font-medium">Typical of the category</th>
                  <th class="px-3 py-2 font-medium text-accent">muiru-tick</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <For each={COMPARISON}>
                  {(row) => (
                    <tr>
                      <td class="px-3 py-2.5 align-top font-medium text-primary">{row.what}</td>
                      <td class="px-3 py-2.5 align-top text-secondary">{row.them}</td>
                      <td class="px-3 py-2.5 align-top text-primary">{row.us}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-2xs text-muted">
            Drawn from published documentation, not marketing pages.
          </p>
        </Section>

        <section class="border-t border-border py-14">
          <h2 class="text-xl font-medium tracking-tight text-primary">
            Stop babysitting a crontab.
          </h2>
          <p class="mt-2 max-w-xl text-sm text-secondary">
            One schedule, one URL, and a run history that tells you the truth.
          </p>
          <A
            href="/signup"
            class="mt-5 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Create your first job
          </A>
        </section>
      </main>

      <footer class="border-t border-border py-6">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 text-2xs text-muted">
          <span>muiru-tick</span>
          <span class="ml-auto">We are the clock. Your endpoint is the work.</span>
        </div>
      </footer>
    </div>
  )
}

/**
 * The dashboard's timeline, standing still enough to read.
 *
 * It is the one screenshot worth putting above the fold, because it is the
 * thing nobody else has: past and future on one axis around a live now.
 */
function HeroTimeline() {
  const [now, setNow] = createSignal(0)
  onMount(() => {
    const started = Date.now()
    const timer = setInterval(() => setNow((Date.now() - started) / 1000), 1000)
    onCleanup(() => clearInterval(timer))
  })

  // Deterministic, so the pitch never shows a lopsided random arrangement.
  const past = [4, 11, 17, 23, 26, 31, 36, 39, 44, 47]
  const future = [56, 60, 64, 69, 73, 78, 82, 87, 91, 96]
  const failedAt = 31
  const lateAt = 39

  return (
    <div class="mt-12 overflow-hidden rounded border border-border bg-surface-1">
      <div class="flex h-8 items-center justify-between border-b border-border px-3 text-2xs text-muted">
        <span class="uppercase tracking-wide">The last hour, and the next</span>
        <span class="num hidden sm:inline">
          {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>
      <svg viewBox="0 0 100 34" class="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="17" y2="17" class="stroke-border-strong" stroke-width="0.2" />
        <For each={future}>
          {(x) => <rect x={x} y="9" width="0.45" height="7" class="fill-accent/50" />}
        </For>
        <For each={past}>
          {(x) => (
            <>
              <Show when={x === lateAt}>
                <line x1={x - 4} x2={x} y1="17.6" y2="17.6" class="stroke-late" stroke-width="0.6" />
              </Show>
              <rect
                x={x}
                y="18"
                width="0.55"
                height={x === failedAt ? 11 : 4 + ((x * 7) % 9)}
                class={x === failedAt ? 'fill-fail' : 'fill-ok'}
              />
            </>
          )}
        </For>
        {/* Creeps rightward so the page has a pulse without a loading spinner. */}
        <line
          x1={51 + (now() % 4)}
          x2={51 + (now() % 4)}
          y1="2"
          y2="32"
          class="stroke-now"
          stroke-width="0.3"
        />
        <circle cx={51 + (now() % 4)} cy="2.5" r="0.7" class="fill-now" />
      </svg>
      <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-1.5 text-2xs text-muted">
        <span class="inline-flex items-center gap-1"><span class="h-2 w-1 bg-ok" /> ran</span>
        <span class="inline-flex items-center gap-1"><span class="h-2 w-1 bg-fail" /> failed</span>
        <span class="inline-flex items-center gap-1"><span class="h-0.5 w-3 bg-late" /> late</span>
        <span class="inline-flex items-center gap-1"><span class="h-2 w-1 border border-accent" /> due</span>
        <span class="inline-flex items-center gap-1"><span class="h-2 w-0.5 bg-now" /> now</span>
      </div>
    </div>
  )
}

function Section(props: { eyebrow: string; title: string; children: unknown }) {
  return (
    <section class="border-t border-border py-12">
      <p class="num text-2xs uppercase tracking-[0.2em] text-accent">{props.eyebrow}</p>
      <h2 class="mt-3 max-w-2xl text-xl font-medium leading-snug tracking-tight text-primary">
        {props.title}
      </h2>
      <div class="mt-6">{props.children as never}</div>
    </section>
  )
}

const PILLARS = [
  {
    title: 'A skipped run is still a row',
    body:
      'When a job is still running as its next slot arrives, most schedulers either overlap silently or skip silently. We record the skip and say why, because that row is the diagnosis — your job got slower.',
  },
  {
    title: 'We publish our own lateness',
    body:
      'Every run stores the gap between the slot and when we actually started, and the dashboard shows p50 and p95. Everyone tells you whether your job succeeded. Nobody tells you whether they fired it on time.',
  },
  {
    title: 'The preview is the engine',
    body:
      'The next five fire times in the editor are computed by the same code that triggers the job, in your timezone, with real daylight-saving rules. No second implementation to quietly disagree.',
  },
]

const STEPS = [
  {
    title: 'Describe the schedule',
    body:
      'A cron expression or a plain interval, in your own timezone. The builder shows it back to you in words and gives you the next five fire times before you save.',
  },
  {
    title: 'Point it at a URL',
    body:
      'Method, headers, body, timeout. Auth headers are encrypted at rest and never returned. Variables like {{run_id}} are substituted at send time.',
  },
  {
    title: 'Read the history',
    body:
      'Every attempt, its status, duration and lateness — with retries grouped under the slot they belong to, so a chain reads as one story instead of three rows.',
  },
]

const COMPARISON = [
  {
    what: 'Timezones',
    them: 'Cron evaluated in UTC, or the server’s clock',
    us: 'Per-job IANA timezone with explicit, documented DST behaviour',
  },
  {
    what: 'Overlapping runs',
    them: 'No policy — silently overlaps or silently skips',
    us: 'skip / queue / allow, and the skipped slot is recorded',
  },
  {
    what: 'Retries',
    them: 'Attempt count fixed by your billing tier',
    us: 'Backoff, attempt limit and failure rules per job; Retry-After honoured',
  },
  {
    what: 'Timeout',
    them: 'A fixed 30–60s ceiling',
    us: 'Per job, up to 300 seconds',
  },
  {
    what: 'Sustained failure',
    them: 'Job silently disabled after N failures',
    us: 'You are warned, given a day to fix it, and told when it pauses',
  },
  {
    what: 'Request signing',
    them: 'None — anyone who guesses the URL looks the same as us',
    us: 'HMAC-SHA256 per job, timestamp inside the signature',
  },
  {
    what: 'Their punctuality',
    them: 'Not measured, not shown',
    us: 'Recorded per run, p50 and p95 on the dashboard, alertable',
  },
]
