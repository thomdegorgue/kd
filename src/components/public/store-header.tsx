import Image from 'next/image'

interface StoreHeaderProps {
  name: string
  description: string | null
  coverUrl: string | null
}

export function StoreHeader({ name, description, coverUrl }: StoreHeaderProps) {
  return (
    <div className="space-y-4">
      {coverUrl && (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={coverUrl}
            alt={name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{name}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
