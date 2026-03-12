'use client'

import { useState } from 'react'
import type { TripState } from '@/lib/types'

export interface HotelSaveData {
  mode: 'specific' | 'preference'
  preference: string | null
  specific_hotel_name: string | null
  specific_hotel_area: string | null
  specific_hotel_city: string | null
  specific_hotel_stars: number | null
}

interface HotelsTabPanelProps {
  tripState: Partial<TripState>
  hotelPreference: string | null
  onSave: (data: HotelSaveData) => void
  onClose: () => void
}

function inferStarRating(tripState: Partial<TripState>): number {
  const style = (tripState.travel_style ?? '').toLowerCase()
  const budget = (tripState.budget ?? '').toLowerCase()
  const combined = `${style} ${budget}`

  if (combined.includes('luxury') || combined.includes('high')) return 5
  if (combined.includes('budget') || combined.includes('backpacker')) return 3
  return 4
}

export function HotelsTabPanel({ tripState, hotelPreference, onSave, onClose }: HotelsTabPanelProps) {
  const [mode, setMode] = useState<'specific' | 'preference'>('preference')
  const [preference, setPreference] = useState(hotelPreference ?? '')
  const [hotelName, setHotelName] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [foundHotel, setFoundHotel] = useState<{
    full_name: string; area: string; city: string; star_rating: number
  } | null>(null)

  const stars = inferStarRating(tripState)

  async function handleLookup() {
    setLooking(true)
    setLookupError(null)
    setFoundHotel(null)
    try {
      const res = await fetch('/api/hotels/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_name: hotelName,
          destination: tripState.destination ?? undefined,
        }),
      })
      const data = await res.json()
      if (data.found) {
        setFoundHotel({ full_name: data.full_name, area: data.area, city: data.city, star_rating: data.star_rating })
      } else {
        setLookupError('Could not find a match — try adding the city name or check the spelling.')
      }
    } catch {
      setLookupError('Lookup failed — please enter manually.')
    } finally {
      setLooking(false)
    }
  }

  function handleSave() {
    if (mode === 'specific' && foundHotel) {
      onSave({
        mode: 'specific',
        preference: null,
        specific_hotel_name: foundHotel.full_name,
        specific_hotel_area: foundHotel.area,
        specific_hotel_city: foundHotel.city,
        specific_hotel_stars: foundHotel.star_rating,
      })
    } else {
      onSave({
        mode: 'preference',
        preference: preference || null,
        specific_hotel_name: null,
        specific_hotel_area: null,
        specific_hotel_city: null,
        specific_hotel_stars: null,
      })
    }
    onClose()
  }

  return (
    <div className="border border-sky/30 rounded-2xl bg-white/95 shadow-lg mx-3 mb-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Hotel Preference</h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-umber/50 hover:text-umber transition-colors text-base leading-none"
        >
          ✕
        </button>
      </div>

      {/* Destination pill */}
      {tripState.destination && (
        <p className="text-xs text-umber/70 mb-3">
          Searching in <span className="font-semibold text-navy">{tripState.destination}</span>
        </p>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('preference')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors ${
            mode === 'preference'
              ? 'bg-navy text-white border-navy'
              : 'text-umber border-sky/40 hover:border-sky/60'
          }`}
        >
          Suggest one for me
        </button>
        <button
          type="button"
          onClick={() => setMode('specific')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors ${
            mode === 'specific'
              ? 'bg-navy text-white border-navy'
              : 'text-umber border-sky/40 hover:border-sky/60'
          }`}
        >
          I have a hotel in mind
        </button>
      </div>

      {/* Scrollable body — capped at 40vh so chat input stays visible on small phones */}
      <div className="max-h-[40vh] overflow-y-auto">
        {mode === 'preference' && (
          <>
            {/* Inferred star rating */}
            <p className="text-xs text-umber/70 mb-3">
              Based on your travel style, we&apos;ll suggest a{' '}
              <span className="font-semibold text-navy">{stars}-star</span> hotel.
            </p>

            {/* Hotel preference input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-umber mb-1">
                Hotel preference (optional)
              </label>
              <input
                type="text"
                className="w-full border border-sky/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white text-navy placeholder-umber/40"
                placeholder="e.g. Boutique hotel in Shinjuku"
                value={preference}
                onChange={e => setPreference(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'specific' && (
          <>
            {/* Hotel name input */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-umber mb-1">
                Hotel name
              </label>
              <input
                type="text"
                className="w-full border border-sky/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white text-navy placeholder-umber/40"
                placeholder="e.g. Park Hyatt Tokyo"
                value={hotelName}
                onChange={e => setHotelName(e.target.value)}
              />
            </div>

            {/* Find hotel button */}
            <button
              type="button"
              onClick={handleLookup}
              disabled={looking || hotelName.trim() === ''}
              className="w-full border border-coral/40 text-coral rounded-xl py-2 text-xs font-semibold hover:bg-coral/5 transition-colors disabled:opacity-40"
            >
              {looking ? 'Searching...' : 'Find hotel'}
            </button>

            {/* Lookup error */}
            {lookupError && (
              <p className="text-xs text-umber/70 mt-1">{lookupError}</p>
            )}

            {/* Result card — selected state with checkmark */}
            {foundHotel && (
              <div className="mt-3 border border-coral/50 rounded-xl p-3 bg-coral/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{foundHotel.full_name}</p>
                    <p className="text-xs text-umber mt-0.5">{foundHotel.area}, {foundHotel.city}</p>
                    <p className="text-xs text-umber/70 mt-0.5">{'★'.repeat(foundHotel.star_rating)} ({foundHotel.star_rating}-star)</p>
                  </div>
                  <div className="shrink-0 w-5 h-5 rounded-full bg-coral flex items-center justify-center mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save button — outside scroll container so it's always visible */}
      <button
        type="button"
        onClick={handleSave}
        disabled={mode === 'specific' && !foundHotel}
        className="w-full bg-coral text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-coral/90 transition-colors disabled:opacity-40 mt-4"
      >
        {mode === 'specific' ? 'Save hotel' : 'Save preference'}
      </button>
    </div>
  )
}
