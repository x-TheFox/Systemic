import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-[var(--radius-compact)]",
        className
      )}
      style={{
        backgroundColor: "rgba(255, 97, 84, 0.08)",
      }}
      {...props}
    />
  )
}

export { Skeleton }
