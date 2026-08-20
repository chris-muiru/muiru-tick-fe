import { cva, type VariantProps } from 'class-variance-authority'
import { Show, splitProps, type JSX } from 'solid-js'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg hover:bg-accent/90',
        outline: 'border border-border bg-surface-1 text-primary hover:bg-surface-2',
        ghost: 'text-secondary hover:bg-surface-2 hover:text-primary',
        danger: 'bg-fail text-white hover:bg-fail/90',
      },
      size: {
        // 44px on touch is met by md and lg; sm is for dense desktop toolbars
        // where a pointer is a given.
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-11 px-4 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'class',
    'variant',
    'size',
    'loading',
    'children',
    'disabled',
  ])
  return (
    <button
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={local.disabled || local.loading}
      aria-busy={local.loading}
      {...rest}
    >
      {/* The label stays put and the spinner is additive, so the button does not
          resize mid-click and shift everything beside it. */}
      <Show when={local.loading}>
        <svg class="h-3 w-3 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" class="opacity-25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
      </Show>
      {local.children}
    </button>
  )
}

export { buttonVariants }
