import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--brand)] text-white shadow hover:bg-[var(--brand-dark)] hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/90',
        outline:
          'border-2 border-[var(--text-dark)] bg-transparent text-[var(--text-dark)] hover:bg-[var(--text-dark)]/6 hover:-translate-y-0.5',
        secondary:
          'bg-[var(--sand)] text-[var(--text-dark)] shadow-sm hover:bg-[var(--cream-dark)]',
        ghost:
          'hover:bg-[var(--sand)] hover:text-[var(--text-dark)]',
        link:
          'text-[var(--brand)] underline-offset-4 hover:underline',
        amber:
          'bg-[var(--gold)] text-[var(--text-dark)] shadow hover:brightness-95 hover:-translate-y-0.5',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm:      'h-8 px-4 text-xs',
        lg:      'h-12 px-8 text-base',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
