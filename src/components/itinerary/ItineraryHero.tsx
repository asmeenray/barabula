import Image from 'next/image'

interface ItineraryHeroProps {
  title: string
  coverImageUrl: string | null
  destination: string | null
  dateRange?: string | null
}

export function ItineraryHero({ title, coverImageUrl, destination, dateRange }: ItineraryHeroProps) {
  return (
    <div
      className="relative h-56 md:h-72 w-full overflow-hidden rounded-none"
      data-testid="itinerary-hero"
    >
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/30 to-transparent" />
      {/* Title overlay */}
      <div className="absolute bottom-6 left-6">
        <h1 className="font-serif text-2xl md:text-4xl text-white leading-tight">{title}</h1>
        {destination && (
          <p className="text-sky text-sm mt-1">{destination}</p>
        )}
        {dateRange && (
          <p className="text-sky/70 text-xs mt-0.5">{dateRange}</p>
        )}
      </div>
    </div>
  )
}
