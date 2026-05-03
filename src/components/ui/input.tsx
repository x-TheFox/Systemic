import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-[var(--radius-standard)] border px-2.5 py-1 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-destructive)] aria-invalid:ring-3 aria-invalid:ring-[var(--color-destructive)]/20 md:text-sm",
        "bg-[var(--color-elevated)] border-[var(--color-border-default)] text-[var(--color-text-primary)]",
        "focus-visible:border-[var(--color-accent-primary)] focus-visible:ring-3 focus-visible:ring-[var(--color-accent-primary)]/25 focus-visible:shadow-[0_0_12px_var(--color-accent-primary-dim)]",
        "disabled:bg-[var(--color-surface)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
