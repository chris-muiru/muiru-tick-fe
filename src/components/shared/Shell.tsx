import { A, useNavigate } from '@solidjs/router'
import { For, Show, createEffect, createSignal, onMount, type JSX } from 'solid-js'
import { Skeleton } from '../ui/skeleton'
import { session, switchTenant, endSession } from '../../lib/session'
import { subscribeToEvents, type ConnectionState } from '../../lib/events'
import { useTickInvalidator } from '../../resource/account/hook'
import { ThemeToggle } from './ThemeToggle'
import { LiveIndicator } from './LiveIndicator'
import { Clock } from './Clock'
import { Select } from '../ui/select'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/jobs', label: 'Jobs', icon: '◷' },
  { href: '/incidents', label: 'Incidents', icon: '▲' },
  { href: '/alerting', label: 'Alerting', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

/**
 * A left rail rather than a top bar.
 *
 * Partly so this does not read as muiru-watch with a different accent, and
 * partly because the rail earns its width: the wall clock lives at the top of
 * it, always visible, in the same monospace as every time on screen. In a
 * scheduler the current time is not chrome — it is the reference every other
 * number on the page is relative to.
 */
export function Shell(props: { children: JSX.Element }) {
  const navigate = useNavigate()
  const invalidate = useTickInvalidator()
  const [connection, setConnection] = createSignal<ConnectionState>('connecting')
  // The session lives in localStorage, which the server cannot see, so auth is
  // decided on the client. The server emits a skeleton.
  const [mounted, setMounted] = createSignal(false)
  const [lastEventAt, setLastEventAt] = createSignal<string | undefined>()
  onMount(() => setMounted(true))

  createEffect(() => {
    if (mounted() && !session()) navigate('/login', { replace: true })
  })

  // One stream for the whole app. Events invalidate the query cache; each
  // screen re-reads only what it subscribes to. Nothing polls.
  onMount(() =>
    subscribeToEvents(() => {
      setLastEventAt(new Date().toISOString())
      invalidate()
    }, setConnection),
  )

  const signOut = () => {
    endSession()
    navigate('/login', { replace: true })
  }

  return (
    <Show when={mounted()} fallback={<ShellSkeleton />}>
      <Show when={session()} fallback={<SignInRequired />}>
        {(current) => (
          <div class="min-h-screen bg-surface-0">
            <aside class="fixed inset-y-0 left-0 z-30 hidden w-14 flex-col border-r border-border bg-surface-1 md:flex xl:w-52">
              <A
                href="/dashboard"
                class="flex h-12 items-center gap-2 border-b border-border px-4 text-sm font-semibold tracking-tight text-primary"
              >
                <span class="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-accent text-[11px] font-bold text-accent-fg">
                  ◷
                </span>
                <span class="hidden xl:inline">muiru-tick</span>
              </A>

              <div class="border-b border-border px-4 py-3">
                <Clock />
              </div>

              <nav class="flex-1 py-2 text-xs" aria-label="Main">
                <For each={NAV}>
                  {(item) => (
                    <A
                      href={item.href}
                      title={item.label}
                      class="relative flex h-9 items-center gap-3 px-4 transition-colors hover:bg-surface-2"
                      inactiveClass="text-secondary hover:text-primary"
                      activeClass="bg-accent/10 font-medium text-accent before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-full before:bg-accent"
                    >
                      <span aria-hidden="true" class="w-3 shrink-0 text-center leading-none">
                        {item.icon}
                      </span>
                      <span class="hidden xl:inline">{item.label}</span>
                    </A>
                  )}
                </For>
              </nav>

              <div class="border-t border-border px-4 py-3">
                <LiveIndicator state={connection()} lastEventAt={lastEventAt()} />
                <div class="mt-2 flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    onClick={signOut}
                    title="Sign out"
                    class="hidden h-8 rounded px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-primary xl:block"
                  >
                    Sign out
                  </button>
                </div>
                <Show when={current().tenants.length > 1}>
                  <div class="mt-2 hidden xl:block">
                    <Select
                      value={current().activeTenantUuid}
                      options={current().tenants.map((tenant) => ({
                        value: tenant.uuid,
                        label: tenant.name,
                        hint: tenant.role,
                      }))}
                      onChange={switchTenant}
                    />
                  </div>
                </Show>
              </div>
            </aside>

            {/* A phone gets the thumb-reachable bottom bar instead of the rail,
                so the header only exists below md. */}
            <header class="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-surface-0/90 px-3 backdrop-blur-sm md:hidden">
              <span class="grid h-5 w-5 place-items-center rounded-sm bg-accent text-[11px] font-bold text-accent-fg">
                ◷
              </span>
              <Clock compact />
              <span class="ml-auto flex items-center gap-2">
                <LiveIndicator state={connection()} lastEventAt={lastEventAt()} />
                <ThemeToggle />
              </span>
            </header>

            <main class="min-w-0 max-w-[1500px] overflow-x-hidden px-3 pb-20 pt-4 md:ml-14 md:px-4 md:pb-6 xl:ml-52">
              {props.children}
            </main>

            <nav
              class="pad-safe-bottom fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-surface-0/95 backdrop-blur-sm md:hidden"
              aria-label="Main"
            >
              <For each={NAV}>
                {(item) => (
                  <A
                    href={item.href}
                    class="relative flex h-14 flex-col items-center justify-center gap-1 text-[10px] transition-colors active:bg-surface-2"
                    inactiveClass="text-muted"
                    activeClass="bg-accent/10 font-medium text-accent after:absolute after:inset-x-4 after:top-0 after:h-[3px] after:rounded-b-full after:bg-accent"
                  >
                    <span aria-hidden="true" class="text-sm leading-none">
                      {item.icon}
                    </span>
                    {item.label}
                  </A>
                )}
              </For>
            </nav>
          </div>
        )}
      </Show>
    </Show>
  )
}

function ShellSkeleton() {
  return (
    <div class="min-h-screen bg-surface-0">
      <aside class="fixed inset-y-0 left-0 hidden w-14 border-r border-border bg-surface-1 md:block xl:w-52" />
      <main class="max-w-[1500px] space-y-4 px-4 py-5 md:ml-14 xl:ml-52">
        <Skeleton class="h-7 w-40" />
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-64 w-full" />
      </main>
    </div>
  )
}

function SignInRequired() {
  return (
    <div class="grid min-h-screen place-items-center bg-surface-0 px-5">
      <div class="w-full max-w-sm rounded-lg border border-border bg-surface-1 p-5 text-center">
        <p class="text-sm font-medium text-primary">You are signed out</p>
        <p class="mt-1 text-xs text-secondary">
          Your jobs keep firing on the server while you are away — sign back in to see them.
        </p>
        <A
          href="/login"
          class="mt-3 inline-block rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
        >
          Sign in
        </A>
      </div>
    </div>
  )
}
