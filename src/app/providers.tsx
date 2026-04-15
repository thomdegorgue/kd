'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          {children}
          <Toaster
            position="top-center"
            closeButton
            offset={16}
            toastOptions={{
              unstyled: false,
              classNames: {
                toast:
                  'kd-toast group relative flex w-[min(90vw,22rem)] max-w-[min(90vw,22rem)] items-start gap-3 rounded-sm border border-border bg-popover px-3.5 py-3.5 pr-11 text-popover-foreground shadow-sm',
                title: 'text-[13px] font-medium leading-snug text-foreground',
                description: 'text-xs leading-snug text-muted-foreground mt-1',
                actionButton: 'text-xs font-medium',
                cancelButton: 'text-xs font-medium',
                closeButton:
                  'absolute right-2 top-2 z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5',
                error: 'border-destructive/35',
                success: 'border-border',
                warning: 'border-border',
                info: 'border-border',
              },
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
