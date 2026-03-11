'use client'

import Link from 'next/link'
import Image from 'next/image'

interface Trip {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  cover_image_url: string | null
  created_at: string
}

interface MyTripsProps {
  trips: Trip[]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MyTrips({ trips }: MyTripsProps) {
  return (
    <section className="py-12 px-6 max-w-5xl mx-auto">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl md:text-3xl text-navy">My Trips</h2>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-coral hover:text-coral/80 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {trips.map(trip => (
          <Link
            key={trip.id}
            href={`/itinerary/${trip.id}`}
            className="group bg-white rounded-xl shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200"
          >
            {/* Image */}
            <div className="relative aspect-video w-full bg-sand">
              {trip.cover_image_url ? (
                <Image
                  src={trip.cover_image_url}
                  alt={trip.destination ?? trip.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Map pin placeholder icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 text-umber/30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 14 6 14s6-8.75 6-14c0-3.314-2.686-6-6-6z" />
                    <circle cx="12" cy="8" r="2" />
                  </svg>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-4">
              <p className="font-semibold text-navy text-sm leading-snug truncate">
                {trip.title}
              </p>
              <p className="text-xs text-umber/50 mt-1">
                {relativeTime(trip.created_at)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
