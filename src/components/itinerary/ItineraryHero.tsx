'use client'

import { useState, useEffect } from 'react'

interface ItineraryHeroProps {
  title: string
  coverImageUrl: string | null
  destination: string | null
  dateRange?: string | null
}

type DestinationPhoto = {
  url: string
  photographer?: string
  photographerUrl?: string
} | null

export function ItineraryHero({ title, coverImageUrl, destination, dateRange }: ItineraryHeroProps) {
  const [photo, setPhoto] = useState<DestinationPhoto>(null)
  const [loaded, setLoaded] = useState(false)

  const activeUrl = coverImageUrl || photo?.url || null

  useEffect(() => {
    if (coverImageUrl || !destination) return
    fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`)
      .then(r => r.json())
      .then(data => {
        if (data.url) setPhoto({ url: data.url, photographer: data.photographer, photographerUrl: data.photographerUrl })
      })
      .catch(() => {})
  }, [destination, coverImageUrl])

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '320px' }}
      data-testid="itinerary-hero"
    >
      {/* Background: photo or gradient */}
      {activeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={`${destination ?? title}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setPhoto(null)}
        />
      ) : null}

      {/* Gradient fallback (always rendered, fades behind photo) */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-navy via-[#1e3a5f] to-umber transition-opacity duration-700 ${activeUrl && loaded ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Noise texture overlay for depth */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
      }} />

      {/* Layered gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/40 to-navy/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/50 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="max-w-2xl">
          {destination && (
            <p className="text-coral text-xs font-sans font-semibold tracking-[0.2em] uppercase mb-2 opacity-90">
              {destination}
            </p>
          )}
          <h1 className="font-serif text-3xl md:text-5xl text-white leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            {title}
          </h1>
          {dateRange && (
            <p className="text-sky/70 text-sm mt-2 font-sans">{dateRange}</p>
          )}
        </div>
      </div>

      {/* Photographer credit */}
      {photo?.photographer && (
        <a
          href={photo.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-3 text-white/30 text-[10px] hover:text-white/60 transition-colors font-sans"
        >
          Photo: {photo.photographer} · Pexels
        </a>
      )}
    </div>
  )
}
