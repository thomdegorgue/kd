import Image from 'next/image'
import { MapPin, Clock } from 'lucide-react'

interface StoreHeaderProps {
  name: string
  description: string | null
  coverUrl: string | null
  city?: string | null
  hours?: string | null
}

export function StoreHeader({ name, description, coverUrl, city, hours }: StoreHeaderProps) {
  return (
    <div className="space-y-4">
      {coverUrl && (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={coverUrl}
            alt={name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {(city || hours) && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{city}</span>
              </div>
            )}
            {hours && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{hours}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
