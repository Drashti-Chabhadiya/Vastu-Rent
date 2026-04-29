import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--brand)] text-white',
        secondary:
          'border-transparent bg-[var(--sand)] text-[var(--text-dark)]',
        destructive:
          'border-transparent bg-red-500 text-white',
        outline:
          'border-[var(--line)] text-[var(--text-dark)]',
        amber:
          'border-transparent bg-[var(--gold)] text-[var(--text-dark)]',
        muted:
          'border-[var(--line)] bg-[var(--sand)] text-[var(--text-soft)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
