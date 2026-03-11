'use client'

import { useState, useEffect } from 'react'

interface ItineraryHeroProps {
  title: string
  coverImageUrl: string | null
  destination: string | null
  dateRange?: string | null
  onBack: () => void
  onDelete: () => void
  onEditTitle: () => void
  editingTitle: boolean
  titleDraft: string
  onTitleDraftChange: (v: string) => void
  onTitleSave: () => void
}

type DestinationPhoto = { url: string; photographer?: string; photographerUrl?: string } | null

export function ItineraryHero({
  title, coverImageUrl, destination, dateRange,
  onBack, onDelete, onEditTitle,
  editingTitle, titleDraft, onTitleDraftChange, onTitleSave,
}: ItineraryHeroProps) {
  const [photo, setPhoto] = useState<DestinationPhoto>(null)
  const [loaded, setLoaded] = useState(false)
  const activeUrl = coverImageUrl || photo?.url || null

  useEffect(() => {
    if (coverImageUrl || !destination) return
    fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`)
      .then(r => r.json())
      .then(data => { if (data.url) setPhoto({ url: data.url, photographer: data.photographer, photographerUrl: data.photographerUrl }) })
      .catch(() => {})
  }, [destination, coverImageUrl])

  return (
    <div
      className="relative shrink-0 w-full overflow-hidden"
      style={{ height: '88px' }}
      data-testid="itinerary-hero"
    >
      {/* Background photo */}
      {activeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={destination ?? title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setPhoto(null)}
        />
      )}
      {/* Gradient bg (fallback + always-on overlay) */}
      <div className={`absolute inset-0 bg-gradient-to-r from-navy via-[#1e3a5f] to-umber/80 transition-opacity duration-700 ${activeUrl && loaded ? 'opacity-70' : 'opacity-100'}`} />
      <div className="absolute inset-0 bg-navy/60" />

      {/* Content: single horizontal row */}
      <div className="relative h-full flex items-center px-4 md:px-6 gap-4">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors shrink-0"
          aria-label="Back to My Trips"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Destination + Title */}
        <div className="flex-1 min-w-0">
          {destination && (
            <p className="text-coral text-[10px] font-semibold tracking-[0.18em] uppercase leading-none mb-1 opacity-90">
              {destination}
            </p>
          )}
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={e => onTitleDraftChange(e.target.value)}
              onBlur={onTitleSave}
              onKeyDown={e => { if (e.key === 'Enter') onTitleSave() }}
              className="font-serif text-base text-white w-full bg-transparent border-b border-white/40 focus:border-white focus:outline-none truncate"
              autoFocus
            />
          ) : (
            <h1
              className="font-serif text-base md:text-lg text-white leading-none truncate cursor-pointer hover:text-sky transition-colors"
              onClick={onEditTitle}
              title="Click to rename"
            >
              {title}
            </h1>
          )}
          {dateRange && (
            <p className="text-white/40 text-[11px] mt-1 leading-none">{dateRange}</p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="shrink-0 text-white/30 hover:text-red-400 transition-colors text-[11px]"
        >
          Delete
        </button>
      </div>

      {/* Photographer credit */}
      {photo?.photographer && (
        <a
          href={photo.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-2 text-white/20 text-[9px] hover:text-white/50 transition-colors"
        >
          {photo.photographer} · Pexels
        </a>
      )}
    </div>
  )
}
