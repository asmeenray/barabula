'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState, useEffect } from 'react'

interface ItineraryData {
  title: string
  destination: string
  start_date: string
  end_date: string
  dayCount: number
  activityCount: number
}

interface ContextPanelProps {
  itineraryData: ItineraryData | null
  isGenerating: boolean
}

// Ambient destination images — rotated randomly per session
const AMBIENT_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80', // Japan temple
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80', // Mountain lake
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', // Beach
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80', // Paris
]

function AmbientPanel({ isGenerating }: { isGenerating: boolean }) {
  // Start with index 0 (same on server + client), randomise after hydration
  const [image, setImage] = useState(AMBIENT_IMAGES[0])

  useEffect(() => {
    setImage(AMBIENT_IMAGES[Math.floor(Math.random() * AMBIENT_IMAGES.length)])
  }, [])
  return (
    <div className="absolute inset-0">
      {/* Destination image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt="destination"
        className="w-full h-full object-cover opacity-40"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gray-950/60" />
      {/* Centered text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-4 font-medium">
          {isGenerating ? 'Building your itinerary...' : 'Understanding your trip...'}
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-white/90 leading-snug">
          {isGenerating
            ? 'Crafting every detail'
            : 'Tell me about your\nperfect trip'}
        </h2>
        {isGenerating && (
          <div className="flex gap-1.5 mt-6">
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function ItineraryPanel({ data }: { data: ItineraryData }) {
  const dateRange = data.start_date && data.end_date
    ? `${new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : null

  return (
    <div className="absolute inset-0 overflow-y-auto p-8 flex flex-col justify-center bg-gray-950">
      <div className="max-w-sm mx-auto w-full">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-medium">Your trip</p>
        <h2 className="font-serif text-3xl text-white mb-1">{data.title}</h2>
        {data.destination && (
          <p className="text-white/60 text-sm mb-6">{data.destination}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Days</p>
            <p className="text-white text-2xl font-semibold">{data.dayCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Activities</p>
            <p className="text-white text-2xl font-semibold">{data.activityCount}</p>
          </div>
        </div>

        {dateRange && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-white/40 text-xs mb-1">Dates</p>
            <p className="text-white text-sm">{dateRange}</p>
          </div>
        )}

        <p className="text-white/40 text-xs text-center">
          Navigating to your itinerary...
        </p>
      </div>
    </div>
  )
}

export function ContextPanel({ itineraryData, isGenerating }: ContextPanelProps) {
  return (
    <div className="relative h-full" data-testid="context-panel">
      <AnimatePresence mode="wait">
        {!itineraryData ? (
          <motion.div
            key="ambient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <AmbientPanel isGenerating={isGenerating} />
          </motion.div>
        ) : (
          <motion.div
            key="itinerary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <ItineraryPanel data={itineraryData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
