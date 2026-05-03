import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent rounded-[var(--radius-compact)] bg-gradient-to-b from-[var(--color-accent-primary)] to-[#d4503f] text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_2px_8px_var(--color-accent-primary-glow),inset_0_1px_0_rgba(255,255,255,0.2)] [a]:hover:opacity-90 focus-visible:border-[var(--color-accent-primary)] focus-visible:ring-[var(--color-accent-primary)]/30 shimmer-sweep",
        outline:
          "border-[var(--color-border-default)] rounded-[var(--radius-compact)] bg-[var(--color-elevated)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-text-primary)] hover:shadow-[0_0_12px_var(--color-accent-primary-dim)] aria-expanded:bg-[var(--color-overlay)] aria-expanded:text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent-primary)] focus-visible:ring-[var(--color-accent-primary)]/30",
        secondary:
          "border-transparent rounded-[var(--radius-compact)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-text-primary)] aria-expanded:bg-[var(--color-overlay)] aria-expanded:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-border-strong)]",
        ghost:
          "border-transparent rounded-[var(--radius-compact)] text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay)] hover:text-[var(--color-accent-primary)] hover:[text-shadow:0_0_8px_var(--color-accent-primary-glow)] aria-expanded:bg-[var(--color-overlay)] aria-expanded:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-border-strong)]",
        destructive:
          "border-transparent rounded-[var(--radius-compact)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/20 focus-visible:border-[var(--color-destructive)]/40 focus-visible:ring-[var(--color-destructive)]/20 hover:shadow-[0_0_12px_var(--color-destructive-dim)]",
        link:
          "border-transparent rounded-[var(--radius-compact)] text-[var(--color-accent-primary)] underline-offset-4 hover:underline hover:[text-shadow:0_0_8px_var(--color-accent-primary-glow)]",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[var(--radius-compact)] px-2 text-xs in-data-[slot=button-group]:rounded-[var(--radius-compact)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[var(--radius-compact)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-[var(--radius-compact)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[var(--radius-compact)] in-data-[slot=button-group]:rounded-[var(--radius-compact)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[var(--radius-compact)] in-data-[slot=button-group]:rounded-[var(--radius-compact)]",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
