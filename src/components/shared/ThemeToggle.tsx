import { Show } from 'solid-js'
import { theme, toggleTheme } from '../../lib/theme'

export function ThemeToggle() {
  return (
    <button
      onClick={toggleTheme}
      class="grid h-8 w-8 place-items-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-primary"
      aria-label={theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Show when={theme() === 'dark'} fallback={<span aria-hidden="true">☾</span>}>
        <span aria-hidden="true">☀</span>
      </Show>
    </button>
  )
}
