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
  onToggleMap: () => void
  showMap: boolean
}

type DestinationPhoto = { url: string; photographer?: string; photographerUrl?: string } | null

export function ItineraryHero({
  title, coverImageUrl, destination, dateRange,
  onBack, onDelete, onEditTitle,
  editingTitle, titleDraft, onTitleDraftChange, onTitleSave,
  onToggleMap, showMap,
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
      style={{ height: '72px' }}
      data-testid="itinerary-hero"
    >
      {/* Full-bleed background photo */}
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

      {/* Dark gradient base — always present */}
      <div
        className="absolute inset-0"
        style={{
          background: activeUrl && loaded
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.42) 100%)'
            : 'linear-gradient(135deg, rgba(40,81,133,0.95) 0%, rgba(28,44,64,0.98) 100%)',
        }}
      />

      {/* Glassmorphism content row */}
      <div className="relative h-full flex items-center gap-3 px-4 md:px-5">
        {/* Back */}
        <button
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          {destination && (
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase leading-none mb-0.5"
               style={{ color: '#D67940', opacity: 0.9 }}>
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
              className="font-serif text-lg text-white w-full bg-transparent border-b focus:outline-none leading-tight"
              style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              autoFocus
            />
          ) : (
            <h1
              className="font-serif text-lg text-white leading-tight truncate cursor-pointer transition-opacity hover:opacity-80"
              onClick={onEditTitle}
              title="Click to rename"
            >
              {title}
            </h1>
          )}
          {dateRange && (
            <p className="text-[10px] leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {dateRange}
            </p>
          )}
        </div>

        {/* Show Map toggle button */}
        <button
          onClick={onToggleMap}
          aria-label={showMap ? 'Hide Map' : 'Show Map'}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
          style={{
            background: showMap ? 'rgba(214,121,64,0.9)' : 'rgba(214,121,64,0.85)',
            color: 'white',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(214,121,64,0.5)',
            boxShadow: showMap ? '0 2px 12px rgba(214,121,64,0.35)' : '0 2px 8px rgba(214,121,64,0.2)',
          }}
        >
          {/* Map pin SVG icon */}
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
            <path d="M5.5 0C3.015 0 1 2.015 1 4.5C1 7.628 5.5 13 5.5 13C5.5 13 10 7.628 10 4.5C10 2.015 7.985 0 5.5 0Z" fill="white"/>
            <circle cx="5.5" cy="4.5" r="1.8" fill="rgba(214,121,64,0.9)"/>
          </svg>
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
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
          className="absolute bottom-1 right-2 text-[8px] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {photo.photographer} · Pexels
        </a>
      )}
    </div>
  )
}
