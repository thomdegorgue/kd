import { Skeleton } from '@/components/ui/skeleton'

export default function CustomersLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36" />
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  )
}
