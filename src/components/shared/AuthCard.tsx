import type { JSX } from 'solid-js'

export function AuthCard(props: { title: string; subtitle: string; children: JSX.Element; footer: JSX.Element }) {
  return (
    <div class="grid min-h-screen place-items-center bg-surface-0 px-5 py-10">
      <div class="w-full max-w-sm">
        <div class="mb-5 flex items-center gap-2">
          <span class="grid h-6 w-6 place-items-center rounded bg-accent text-xs font-bold text-accent-fg">
            ◷
          </span>
          <span class="text-sm font-semibold tracking-tight text-primary">muiru-tick</span>
        </div>
        <div class="rounded-lg border border-border bg-surface-1 p-5">
          <h1 class="text-lg font-medium text-primary">{props.title}</h1>
          <p class="mt-1 text-xs text-secondary">{props.subtitle}</p>
          <div class="mt-4 space-y-3">{props.children}</div>
        </div>
        <div class="mt-3 text-center text-xs text-secondary">{props.footer}</div>
      </div>
    </div>
  )
}
