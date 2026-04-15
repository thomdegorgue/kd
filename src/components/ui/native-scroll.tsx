"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type NativeScrollProps = React.ComponentProps<"div"> & {
  /**
   * Scroll vertical por defecto.
   * Si necesitás horizontal, pasá `overflow-x-auto` en className.
   */
}

export function NativeScroll({ className, ...props }: NativeScrollProps) {
  return (
    <div
      data-slot="native-scroll"
      className={cn(
        "min-h-0 overflow-y-auto overscroll-contain scroll-smooth scroll-pb-3",
        // Scrollbar fino y discreto (Firefox + WebKit).
        "scrollbar-gutter-stable",
        "[scrollbar-width:thin] [scrollbar-color:hsl(var(--foreground)/0.28)_transparent]",
        "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/18",
        "[&::-webkit-scrollbar-thumb:hover]:bg-foreground/30 [&::-webkit-scrollbar-thumb:active]:bg-foreground/40",
        className
      )}
      {...props}
    />
  )
}

