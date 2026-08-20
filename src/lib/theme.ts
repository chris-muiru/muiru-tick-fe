import { createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'muiru-tick-theme'

function initial(): Theme {
  if (isServer) return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // Dark-first: this is a screen people open at 3am to find out what did not
  // run, and the OS preference only overrides it when light was asked for.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const [theme, setThemeSignal] = createSignal<Theme>(initial())
export { theme }

export function applyTheme(next: Theme) {
  document.documentElement.classList.toggle('dark', next === 'dark')
  localStorage.setItem(STORAGE_KEY, next)
  setThemeSignal(next)
}

export function toggleTheme() {
  applyTheme(theme() === 'dark' ? 'light' : 'dark')
}
