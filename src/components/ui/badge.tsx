import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-compact)] border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(255,97,84,0.4)] bg-[rgba(255,97,84,0.15)] text-[var(--color-accent-primary)] [a]:hover:bg-[rgba(255,97,84,0.25)]",
        secondary:
          "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] [a]:hover:bg-[var(--color-overlay)]",
        destructive:
          "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]/20 [a]:hover:bg-[var(--color-destructive)]/20",
        outline:
          "border-[var(--color-border-default)] bg-transparent text-[var(--color-text-secondary)] [a]:hover:bg-[var(--color-overlay)] [a]:hover:text-[var(--color-text-primary)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text-primary)]",
        link: "border-transparent bg-transparent text-[var(--color-accent-primary)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
