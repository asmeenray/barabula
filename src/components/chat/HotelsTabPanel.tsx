'use client'

import { useState } from 'react'
import type { TripState } from '@/lib/types'

interface HotelsTabPanelProps {
  tripState: Partial<TripState>
  hotelPreference: string | null
  onSave: (preference: string) => void
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
  const [preference, setPreference] = useState(hotelPreference ?? '')
  const stars = inferStarRating(tripState)

  function handleSave() {
    onSave(preference)
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

      {/* Scrollable body — capped at 40vh so chat input stays visible on small phones */}
      <div className="max-h-[40vh] overflow-y-auto">
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

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-coral text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-coral/90 transition-colors"
        >
          Save preference
        </button>
      </div>
    </div>
  )
}
