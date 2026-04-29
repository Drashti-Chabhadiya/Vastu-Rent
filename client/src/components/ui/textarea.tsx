import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-[var(--line)] bg-[var(--warm-white)] px-4 py-2.5 text-sm text-[var(--text-dark)] placeholder:text-[var(--text-soft)] outline-none transition resize-none',
        'focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
