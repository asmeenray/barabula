'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { DaySection } from '@/components/itinerary/DaySection'
import { DayPillNav } from '@/components/itinerary/DayPillNav'
import { ItineraryHero } from '@/components/itinerary/ItineraryHero'
import { ActivityForm } from '@/components/itinerary/ActivityForm'
import { SkeletonText } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { resolveActivityCoordinates } from '@/lib/geocoding'
import type { Activity, Itinerary } from '@/lib/types'
import type { MapPin } from '@/components/itinerary/ItineraryMap'

// SSR-safe map import
const ItineraryMap = dynamic(() => import('@/components/itinerary/ItineraryMap'), { ssr: false })

type ItineraryWithActivities = Itinerary & {
  activities: Activity[]
  cover_image_url?: string | null
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Not found')
  return r.json()
})

// Group activities by day_number, sort days ascending
function groupByDay(activities: Activity[]): Map<number, Activity[]> {
  const map = new Map<number, Activity[]>()
  for (const act of activities) {
    const list = map.get(act.day_number) ?? []
    list.push(act)
    map.set(act.day_number, list)
  }
  // Sort each day's activities: Morning → Afternoon → Evening, then HH:MM for exact times
  const TIME_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 }
  const timeRank = (t: string): number => {
    const lower = (t ?? '').toLowerCase()
    if (lower in TIME_ORDER) return TIME_ORDER[lower]
    return 10 + (parseFloat(t.replace(':', '.')) || 0)
  }
  for (const [day, acts] of map) {
    map.set(day, acts.sort((a, b) => timeRank(a.time ?? '') - timeRank(b.time ?? '')))
  }
  return map
}

export default function ItineraryDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const { data, error, isLoading, mutate } = useSWR<ItineraryWithActivities>(
    `/api/itineraries/${id}`,
    fetcher
  )

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')

  // Activity form modal state
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [formDay, setFormDay] = useState<number>(1)

  // Map and interaction state
  const [mapPins, setMapPins] = useState<MapPin[]>([])
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<number | null>(null)

  // Mobile tab toggle
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list')

  // Geocoding: resolve coordinates after data loads
  useEffect(() => {
    if (!data?.activities) return
    const activities = data.activities.filter(a => a.location)
    Promise.all(
      activities.map(async (act, i) => {
        const coords = await resolveActivityCoordinates(act, data.destination ?? null)
        if (!coords) return null
        return {
          id: act.id,
          name: act.name,
          day: act.day_number,
          lng: coords.lng,
          lat: coords.lat,
          type: (act.activity_type === 'hotel' ? 'hotel' : 'activity') as 'activity' | 'hotel',
          sequenceNumber: i + 1,
        }
      })
    ).then(results => setMapPins(results.filter(Boolean) as MapPin[]))
  }, [data?.activities, data?.destination])

  // ---- Inline editing handlers ----
  function startEditTitle() {
    setTitleDraft(data?.title ?? '')
    setEditingTitle(true)
  }

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === data?.title) {
      setEditingTitle(false)
      return
    }
    setEditingTitle(false)
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft.trim() }),
    })
    mutate()
  }

  function startEditDescription() {
    setDescriptionDraft(data?.description ?? '')
    setEditingDescription(true)
  }

  async function saveDescription() {
    setEditingDescription(false)
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descriptionDraft }),
    })
    mutate()
  }

  // ---- Activity handlers ----
  function openAddActivity(dayNumber: number) {
    setEditingActivity(null)
    setFormDay(dayNumber)
    setActivityFormOpen(true)
  }

  function openEditActivity(activity: Activity) {
    setEditingActivity(activity)
    setFormDay(activity.day_number)
    setActivityFormOpen(true)
  }

  async function handleSaveActivity(actData: Omit<Activity, 'id' | 'activity_type'>) {
    if (editingActivity) {
      await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData),
      })
    } else {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData),
      })
    }
    setActivityFormOpen(false)
    setEditingActivity(null)
    mutate()
  }

  async function handleDeleteActivity(activityId: string) {
    await fetch(`/api/activities/${activityId}`, { method: 'DELETE' })
    mutate()
  }

  // ---- Map/card interaction ----
  function handlePinClick(pinId: string) {
    setActiveActivityId(pinId)
    document.getElementById(`activity-${pinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleCardClick(actId: string) {
    setActiveActivityId(actId)
  }

  function handleDayChange(day: number) {
    setActiveDay(day === 0 ? null : day)
  }

  // ---- Delete itinerary ----
  async function handleDeleteItinerary() {
    const confirmed = window.confirm(`Delete "${data?.title}"? This cannot be undone.`)
    if (!confirmed) return
    await fetch(`/api/itineraries/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <SkeletonText lines={2} />
        <SkeletonText lines={4} />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorMessage message="Itinerary not found or failed to load." onRetry={() => mutate()} />
  }

  const dayMap = groupByDay(data.activities ?? [])
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)
  // If no activities yet, show day 1 as an empty day
  if (sortedDays.length === 0) sortedDays.push(1)

  const displayedDays = activeDay ? sortedDays.filter(d => d === activeDay) : sortedDays

  const dateRange = data.start_date && data.end_date
    ? `${data.start_date} – ${data.end_date}`
    : data.start_date ?? null

  return (
    <div className="min-h-screen bg-sand">
      {/* Cover image hero */}
      <ItineraryHero
        title={data.title}
        coverImageUrl={data.cover_image_url ?? null}
        destination={data.destination}
        dateRange={dateRange}
      />

      {/* Breadcrumb + actions bar */}
      <div className="px-4 md:px-6 py-3 flex items-center justify-between border-b border-sky/50 bg-white/80 backdrop-blur-sm sticky top-16 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-umber hover:text-navy flex items-center gap-1 transition-colors"
        >
          ← My Trips
        </button>
        <button
          onClick={handleDeleteItinerary}
          className="text-xs text-umber/60 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
        >
          Delete Trip
        </button>
      </div>

      {/* Mobile tab toggle */}
      <div className="md:hidden flex border-b border-sky sticky top-[calc(4rem+49px)] z-10 bg-white">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'border-b-2 border-coral text-coral' : 'text-umber'
          }`}
        >
          Itinerary
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'border-b-2 border-coral text-coral' : 'text-umber'
          }`}
        >
          Map
        </button>
      </div>

      {/* Split layout: scrollable list + sticky map */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left: scrollable itinerary list */}
        <div
          className={`${mobileTab === 'map' ? 'hidden' : 'flex-1'} md:flex-1 md:block overflow-y-auto bg-sand`}
        >
          {/* Day pill nav */}
          <div className="px-4 md:px-6 pt-4 pb-2">
            <DayPillNav
              days={sortedDays}
              activeDay={activeDay}
              onDayChange={handleDayChange}
            />
          </div>

          {/* Inline-editable title and description */}
          <div className="px-4 md:px-6 pb-4">
            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
                className="font-serif text-2xl text-navy w-full border-b-2 border-coral bg-transparent focus:outline-none"
                autoFocus
              />
            ) : (
              <h1
                className="font-serif text-2xl md:text-3xl text-navy cursor-pointer hover:text-coral transition-colors"
                onClick={startEditTitle}
                title="Click to edit title"
              >
                {data.title}
              </h1>
            )}

            <div className="mt-2">
              {editingDescription ? (
                <textarea
                  value={descriptionDraft}
                  onChange={e => setDescriptionDraft(e.target.value)}
                  onBlur={saveDescription}
                  rows={3}
                  className="w-full text-sm text-umber border border-sky rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-coral bg-white"
                  autoFocus
                />
              ) : (
                <p
                  className="text-sm text-umber cursor-pointer hover:text-navy transition-colors"
                  onClick={startEditDescription}
                  title="Click to edit description"
                >
                  {data.description || (
                    <span className="text-umber/40 italic">Add a description...</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Day sections */}
          <div className="px-4 md:px-6 pb-8">
            {displayedDays.map(dayNumber => (
              <DaySection
                key={dayNumber}
                dayNumber={dayNumber}
                activities={dayMap.get(dayNumber) ?? []}
                activeActivityId={activeActivityId}
                onActivityClick={handleCardClick}
                onAddActivity={openAddActivity}
                onEditActivity={openEditActivity}
                onDeleteActivity={handleDeleteActivity}
              />
            ))}
          </div>
        </div>

        {/* Right: sticky map panel */}
        <div
          className={`${mobileTab === 'list' ? 'hidden' : 'flex-1'} md:w-[45%] md:block h-full`}
        >
          <ItineraryMap
            pins={mapPins}
            activeDay={activeDay}
            activeActivityId={activeActivityId}
            onPinClick={handlePinClick}
          />
        </div>
      </div>

      {/* Activity form modal */}
      {activityFormOpen && (
        <ActivityForm
          initialData={editingActivity ?? undefined}
          dayNumber={formDay}
          itineraryId={id}
          onSave={handleSaveActivity}
          onCancel={() => { setActivityFormOpen(false); setEditingActivity(null) }}
        />
      )}
    </div>
  )
}
