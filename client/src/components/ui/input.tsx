import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-full border border-[var(--line)] bg-[var(--warm-white)] px-4 py-2 text-sm text-[var(--text-dark)] placeholder:text-[var(--text-soft)] outline-none transition',
          'focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
