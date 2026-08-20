import { A, useNavigate } from '@solidjs/router'
import { For, Show, createEffect, createSignal, onMount, type JSX } from 'solid-js'
import { Skeleton } from '../ui/skeleton'
import { session, switchTenant, endSession } from '../../lib/session'
import { subscribeToEvents, type ConnectionState } from '../../lib/events'
import { useTickInvalidator } from '../../resource/account/hook'
import { ThemeToggle } from './ThemeToggle'
import { LiveIndicator } from './LiveIndicator'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/jobs', label: 'Jobs', icon: '◷' },
  { href: '/incidents', label: 'Incidents', icon: '▲' },
  { href: '/alerting', label: 'Alerting', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export function Shell(props: { children: JSX.Element }) {
  const navigate = useNavigate()
  const invalidate = useTickInvalidator()
  const [connection, setConnection] = createSignal<ConnectionState>('connecting')
  // The session lives in localStorage, which the server cannot see. Deciding
  // auth during SSR always renders "signed out", and a hydration hiccup then
  // freezes that wrong answer on screen. The server emits a skeleton; the
  // client decides.
  const [mounted, setMounted] = createSignal(false)
  const [lastEventAt, setLastEventAt] = createSignal<string | undefined>()
  onMount(() => setMounted(true))

  createEffect(() => {
    if (mounted() && !session()) navigate('/login', { replace: true })
  })

  // One stream for the whole app, mounted at the shell. Events invalidate the
  // query cache; each screen re-reads only what it subscribes to. Nothing polls.
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
            <header class="sticky top-0 z-30 border-b border-border bg-surface-0/90 backdrop-blur-sm">
              <div class="mx-auto flex h-12 max-w-[1600px] items-center gap-4 px-4">
                <A
                  href="/dashboard"
                  class="flex items-center gap-2 text-sm font-semibold tracking-tight text-primary"
                >
                  <span class="grid h-5 w-5 place-items-center rounded bg-accent text-[11px] font-bold text-accent-fg">
                    ◷
                  </span>
                  <span class="hidden sm:inline">muiru-tick</span>
                </A>

                <nav class="hidden items-center gap-0.5 text-xs md:flex" aria-label="Main">
                  <For each={NAV}>
                    {(item) => (
                      <A
                        href={item.href}
                        class="relative whitespace-nowrap rounded px-2.5 py-1.5 transition-colors hover:bg-surface-2"
                        inactiveClass="text-secondary hover:text-primary"
                        activeClass="bg-accent/10 font-medium text-accent after:absolute after:inset-x-2.5 after:-bottom-[7px] after:h-0.5 after:rounded-full after:bg-accent"
                      >
                        {item.label}
                      </A>
                    )}
                  </For>
                </nav>

                <div class="ml-auto flex items-center gap-2">
                  <span class="hidden md:inline">
                    <LiveIndicator state={connection()} lastEventAt={lastEventAt()} />
                  </span>
                  <Show when={current().tenants.length > 1}>
                    <select
                      class="h-8 rounded border border-border bg-surface-1 px-1.5 text-xs text-primary"
                      value={current().activeTenantUuid}
                      onChange={(e) => switchTenant(e.currentTarget.value)}
                      aria-label="Workspace"
                    >
                      <For each={current().tenants}>
                        {(tenant) => <option value={tenant.uuid}>{tenant.name}</option>}
                      </For>
                    </select>
                  </Show>
                  <ThemeToggle />
                  <button
                    onClick={signOut}
                    class="h-8 rounded px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-primary"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            {/* pb-20 on mobile clears the fixed bottom bar so the last row is
                never trapped underneath it. */}
            <main class="mx-auto min-w-0 max-w-[1600px] overflow-x-hidden px-3 pb-20 pt-4 sm:px-4 sm:py-5 md:pb-5">
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

/** Matches the shell's real footprint, so first paint does not shift. */
function ShellSkeleton() {
  return (
    <div class="min-h-screen bg-surface-0">
      <header class="border-b border-border">
        <div class="mx-auto flex h-12 max-w-[1600px] items-center gap-4 px-4">
          <Skeleton class="h-5 w-28" />
          <Skeleton class="h-5 w-64" />
          <Skeleton class="ml-auto h-5 w-24" />
        </div>
      </header>
      <main class="mx-auto max-w-[1600px] space-y-4 px-4 py-5">
        <Skeleton class="h-7 w-40" />
        <Skeleton class="h-[68px] w-full" />
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
