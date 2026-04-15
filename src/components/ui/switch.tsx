"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Toggle estilo shadcn/ui (Radix). Encendido = `bg-primary` (color de la tienda vía `--primary`).
 */
const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    size?: "sm" | "default"
  }
>(({ className, size = "default", ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    data-slot="switch"
    data-size={size}
    className={cn(
      "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-0.5 shadow-xs outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:ring-2 aria-invalid:ring-destructive/40",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      size === "default" && "h-6 w-11",
      size === "sm" && "h-5 w-9",
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      data-slot="switch-thumb"
      className={cn(
        "pointer-events-none block rounded-full bg-background shadow-md ring-0 transition-transform duration-200 ease-out will-change-transform",
        size === "default" &&
          "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        size === "sm" &&
          "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
