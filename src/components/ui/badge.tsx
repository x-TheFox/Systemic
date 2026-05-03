import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-accent/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-accent text-white border-accent [a]:hover:bg-accent/80",
        secondary:
          "bg-surface text-fg-dim border-white/[0.08] [a]:hover:bg-white/[0.04]",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-white/[0.08] text-fg-dim [a]:hover:bg-white/[0.04] [a]:hover:text-white",
        ghost:
          "border-transparent text-fg-dim hover:bg-white/[0.04] hover:text-white",
        tag: "rounded-[var(--radius-compact)] bg-white/[0.04] text-fg-dim border-white/[0.06]",
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
