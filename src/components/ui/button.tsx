import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-white border-accent hover:bg-accent/90 hover:shadow-glow",
        outline:
          "border-white/[0.08] bg-transparent text-fg-dim hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12]",
        secondary:
          "bg-surface text-white border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.10]",
        ghost:
          "border-transparent text-fg-dim hover:text-white hover:bg-white/[0.04]",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
        link: "text-accent border-transparent underline-offset-4 hover:underline hover:text-accent/80",
      },
      size: {
        default: "h-9 gap-1.5 px-3 rounded-[var(--radius-compact)]",
        xs: "h-7 gap-1 rounded-[var(--radius-compact)] px-2 text-xs",
        sm: "h-8 gap-1 rounded-[var(--radius-compact)] px-2.5 text-[0.8rem]",
        lg: "h-10 gap-1.5 px-4 rounded-[var(--radius-standard)]",
        icon: "size-9 rounded-[var(--radius-compact)]",
        "icon-xs": "size-7 rounded-[var(--radius-compact)]",
        "icon-sm": "size-8 rounded-[var(--radius-compact)]",
        "icon-lg": "size-10 rounded-[var(--radius-standard)]",
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
