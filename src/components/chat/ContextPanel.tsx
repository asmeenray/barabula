'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ConversationPhase, TripState } from '@/lib/types'

interface ItineraryData {
  title: string
  destination: string
  start_date: string
  end_date: string
  dayCount: number
  activityCount: number
}

type FullItineraryActivity = {
  id: string
  day_number: number
  name: string
  time: string | null
  description: string | null
  location: string | null
}

type FullItineraryData = {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  activities: FullItineraryActivity[]
}

interface ContextPanelProps {
  itineraryData: ItineraryData | null
  isGenerating: boolean
  conversationPhase?: ConversationPhase
  tripState?: Partial<TripState>
  fullItinerary?: FullItineraryData | null
  itineraryId?: string | null
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

function TripSummaryPanel({ tripState }: { tripState: Partial<TripState> }) {
  return (
    <div
      className="absolute inset-0 overflow-y-auto p-8 flex flex-col justify-center bg-gray-950"
      data-testid="trip-summary-panel"
    >
      <div className="max-w-sm mx-auto w-full">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-medium">Trip so far</p>
        {tripState.destination && (
          <h2 className="font-serif text-3xl text-white mb-4">{tripState.destination}</h2>
        )}
        <div className="space-y-3">
          {tripState.travelers_count != null && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Travelers</p>
              <p className="text-white text-sm">
                {tripState.travelers_count}
                {tripState.travelers_type ? ` · ${tripState.travelers_type}` : ''}
              </p>
            </div>
          )}
          {(tripState.dates_start || tripState.dates_end) && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Dates</p>
              <p className="text-white text-sm">
                {tripState.dates_start ?? '?'} → {tripState.dates_end ?? '?'}
              </p>
            </div>
          )}
          {tripState.interests && tripState.interests.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Interests</p>
              <p className="text-white text-sm">{tripState.interests.join(', ')}</p>
            </div>
          )}
          {tripState.budget && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Budget</p>
              <p className="text-white text-sm">{tripState.budget}</p>
            </div>
          )}
          {tripState.travel_style && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Style</p>
              <p className="text-white text-sm">{tripState.travel_style}</p>
            </div>
          )}
          {tripState.pace && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Pace</p>
              <p className="text-white text-sm">{tripState.pace}</p>
            </div>
          )}
        </div>
        <p className="text-white/30 text-xs text-center mt-6">Confirm or adjust below</p>
      </div>
    </div>
  )
}

// Group activities by day_number, sort days ascending
function groupByDay(activities: FullItineraryActivity[]): Map<number, FullItineraryActivity[]> {
  const map = new Map<number, FullItineraryActivity[]>()
  for (const act of activities) {
    const list = map.get(act.day_number) ?? []
    list.push(act)
    map.set(act.day_number, list)
  }
  // Sort each day's activities by time string (lexicographic, sufficient for HH:MM format)
  for (const [day, acts] of map) {
    map.set(day, acts.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))
  }
  return map
}

type EditDraft = {
  name: string
  time: string
  location: string
  description: string
}

type NewActivityDraft = {
  name: string
  time: string
  location: string
  description: string
}

function FullItineraryPanel({
  fullItinerary,
  itineraryId,
}: {
  fullItinerary: FullItineraryData
  itineraryId: string
}) {
  const router = useRouter()

  // Local copy of activities for optimistic edits before user accepts
  const [localActivities, setLocalActivities] = useState<FullItineraryActivity[]>(fullItinerary.activities)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({ name: '', time: '', location: '', description: '' })
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [newActivityDraft, setNewActivityDraft] = useState<NewActivityDraft>({ name: '', time: '', location: '', description: '' })

  const dateRange = fullItinerary.start_date && fullItinerary.end_date
    ? `${new Date(fullItinerary.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(fullItinerary.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : null

  const dayMap = groupByDay(localActivities)
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)
  if (sortedDays.length === 0) sortedDays.push(1)

  const dayCount = sortedDays.length
  const activityCount = localActivities.length

  function startEdit(activity: FullItineraryActivity) {
    setEditingId(activity.id)
    setEditDraft({
      name: activity.name,
      time: activity.time ?? '',
      location: activity.location ?? '',
      description: activity.description ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(activityId: string) {
    // Optimistic local update first
    setLocalActivities(prev =>
      prev.map(a =>
        a.id === activityId
          ? {
              ...a,
              name: editDraft.name.trim() || a.name,
              time: editDraft.time.trim() || null,
              location: editDraft.location.trim() || null,
              description: editDraft.description.trim() || null,
            }
          : a
      )
    )
    setEditingId(null)

    // Attempt to persist via PATCH — fail gracefully if endpoint not available
    // Full editing experience lives in the itinerary detail page; this panel is for quick tweaks before accepting
    try {
      await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name.trim() || undefined,
          time: editDraft.time.trim() || null,
          location: editDraft.location.trim() || null,
          description: editDraft.description.trim() || null,
        }),
      })
    } catch {
      // Persistence failed — local state already updated, will be reflected on next full load
    }
  }

  function startAddActivity(dayNumber: number) {
    setAddingDay(dayNumber)
    setNewActivityDraft({ name: '', time: '', location: '', description: '' })
  }

  function cancelAdd() {
    setAddingDay(null)
  }

  async function saveNewActivity(dayNumber: number) {
    if (!newActivityDraft.name.trim()) return

    const tempId = `temp-${crypto.randomUUID()}`
    const newActivity: FullItineraryActivity = {
      id: tempId,
      day_number: dayNumber,
      name: newActivityDraft.name.trim(),
      time: newActivityDraft.time.trim() || null,
      location: newActivityDraft.location.trim() || null,
      description: newActivityDraft.description.trim() || null,
    }

    // Optimistic local add
    setLocalActivities(prev => [...prev, newActivity])
    setAddingDay(null)

    // Attempt to persist — fail gracefully; full editing in itinerary detail page
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary_id: itineraryId,
          day_number: dayNumber,
          name: newActivity.name,
          time: newActivity.time,
          location: newActivity.location,
          description: newActivity.description,
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        // Replace temp id with real id from server
        setLocalActivities(prev =>
          prev.map(a => (a.id === tempId ? { ...a, id: saved.id } : a))
        )
      }
    } catch {
      // Persistence failed — local state still shows the activity
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/10">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-medium">Your itinerary</p>
        <h2 className="font-serif text-2xl text-white leading-tight mb-1">{fullItinerary.title}</h2>
        {fullItinerary.destination && (
          <p className="text-white/60 text-sm mb-3">{fullItinerary.destination}</p>
        )}
        {/* Stats row */}
        <div className="flex gap-3">
          <div className="bg-white/5 rounded-lg px-3 py-1.5">
            <span className="text-white/40 text-xs">{dayCount} days</span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-1.5">
            <span className="text-white/40 text-xs">{activityCount} activities</span>
          </div>
          {dateRange && (
            <div className="bg-white/5 rounded-lg px-3 py-1.5">
              <span className="text-white/40 text-xs">{dateRange}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable day list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {sortedDays.map(dayNumber => {
          const dayActivities = dayMap.get(dayNumber) ?? []
          return (
            <div key={dayNumber}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-coral text-xs uppercase tracking-widest font-semibold">
                  Day {dayNumber}
                </span>
                <span className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">{dayActivities.length}</span>
              </div>

              {/* Activity rows */}
              <div className="space-y-2">
                {dayActivities.map(activity => (
                  <div key={activity.id}>
                    {editingId === activity.id ? (
                      /* Edit form */
                      <div className="bg-white/5 rounded-xl p-4 border border-coral/30">
                        <div className="space-y-2 mb-3">
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                            placeholder="Activity name"
                            className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editDraft.time}
                              onChange={e => setEditDraft(d => ({ ...d, time: e.target.value }))}
                              placeholder="Time (e.g. 09:00)"
                              className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                            />
                            <input
                              type="text"
                              value={editDraft.location}
                              onChange={e => setEditDraft(d => ({ ...d, location: e.target.value }))}
                              placeholder="Location"
                              className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                            />
                          </div>
                          <input
                            type="text"
                            value={editDraft.description}
                            onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                            placeholder="Description (optional)"
                            className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(activity.id)}
                            className="flex-1 bg-coral text-white text-xs font-medium rounded-lg py-1.5 hover:bg-coral/90 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 bg-white/5 text-white/60 text-xs font-medium rounded-lg py-1.5 hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal activity row */
                      <div className="bg-white/5 rounded-xl p-3 flex items-start gap-3 group">
                        {/* Time badge */}
                        {activity.time && (
                          <span className="shrink-0 bg-sky text-navy text-xs font-medium rounded-md px-2 py-1 mt-0.5 leading-none">
                            {activity.time}
                          </span>
                        )}
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm leading-snug">{activity.name}</p>
                          {activity.location && (
                            <p className="text-white/50 text-xs mt-0.5 truncate">{activity.location}</p>
                          )}
                        </div>
                        {/* Edit button */}
                        <button
                          onClick={() => startEdit(activity)}
                          className="shrink-0 text-white/20 hover:text-coral transition-colors opacity-0 group-hover:opacity-100 p-1"
                          aria-label={`Edit ${activity.name}`}
                        >
                          {/* Pencil icon (inline SVG — no lucide-react in project) */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add activity row or form */}
                {addingDay === dayNumber ? (
                  <div className="bg-white/5 rounded-xl p-4 border border-coral/30">
                    <div className="space-y-2 mb-3">
                      <input
                        type="text"
                        value={newActivityDraft.name}
                        onChange={e => setNewActivityDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="Activity name *"
                        className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newActivityDraft.time}
                          onChange={e => setNewActivityDraft(d => ({ ...d, time: e.target.value }))}
                          placeholder="Time (e.g. 14:00)"
                          className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                        />
                        <input
                          type="text"
                          value={newActivityDraft.location}
                          onChange={e => setNewActivityDraft(d => ({ ...d, location: e.target.value }))}
                          placeholder="Location"
                          className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-coral/60"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveNewActivity(dayNumber)}
                        disabled={!newActivityDraft.name.trim()}
                        className="flex-1 bg-coral text-white text-xs font-medium rounded-lg py-1.5 hover:bg-coral/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        onClick={cancelAdd}
                        className="flex-1 bg-white/5 text-white/60 text-xs font-medium rounded-lg py-1.5 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startAddActivity(dayNumber)}
                    className="w-full py-2 border border-dashed border-white/15 rounded-xl text-xs text-white/30 hover:text-coral hover:border-coral/40 transition-colors"
                  >
                    + Add activity
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Accept button — fixed at bottom */}
      <div className="shrink-0 px-6 pb-6 pt-4 border-t border-white/10">
        <button
          onClick={() => router.push(`/itinerary/${itineraryId}`)}
          className="w-full bg-coral text-white font-semibold text-sm rounded-xl py-4 hover:bg-coral/90 active:scale-[0.98] transition-all"
        >
          Accept &amp; View Full Itinerary →
        </button>
      </div>
    </div>
  )
}

export function ContextPanel({ itineraryData, isGenerating, conversationPhase, tripState, fullItinerary, itineraryId }: ContextPanelProps) {
  const showSummary = !itineraryData && conversationPhase === 'ready_for_summary'

  // Priority chain:
  // 1. fullItinerary present → FullItineraryPanel
  // 2. conversationPhase === 'ready_for_summary' → TripSummaryPanel
  // 3. itineraryData → ItineraryPanel
  // 4. default → AmbientPanel

  return (
    <div className="relative h-full" data-testid="context-panel">
      <AnimatePresence mode="wait">
        {fullItinerary && itineraryId ? (
          <motion.div
            key="full-itinerary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <FullItineraryPanel fullItinerary={fullItinerary} itineraryId={itineraryId} />
          </motion.div>
        ) : itineraryData ? (
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
        ) : showSummary ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <TripSummaryPanel tripState={tripState ?? {}} />
          </motion.div>
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  )
}
