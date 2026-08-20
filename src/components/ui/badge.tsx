import { cva, type VariantProps } from 'class-variance-authority'
import { splitProps, type JSX } from 'solid-js'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium leading-none',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-surface-2 text-secondary',
        ok: 'border-ok/30 bg-ok/10 text-ok',
        fail: 'border-fail/30 bg-fail/10 text-fail',
        late: 'border-late/30 bg-late/10 text-late',
        skipped: 'border-skipped/30 bg-skipped/10 text-skipped',
        accent: 'border-accent/30 bg-accent/10 text-accent',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends JSX.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ['class', 'variant'])
  return <span class={cn(badgeVariants({ variant: local.variant }), local.class)} {...rest} />
}
