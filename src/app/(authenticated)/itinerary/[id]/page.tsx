'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react'
import { DaySection } from '@/components/itinerary/DaySection'
import { DayPillNav } from '@/components/itinerary/DayPillNav'
import { ItineraryHero } from '@/components/itinerary/ItineraryHero'
import { ActivityForm } from '@/components/itinerary/ActivityForm'
import { SkeletonText } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { resolveActivityCoordinates } from '@/lib/geocoding'
import type { Activity, Itinerary } from '@/lib/types'
import type { MapPin } from '@/components/itinerary/ItineraryMap'

const ItineraryMap = dynamic(() => import('@/components/itinerary/ItineraryMap'), { ssr: false })

type ItineraryWithActivities = Itinerary & {
  activities: Activity[]
  cover_image_url?: string | null
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Not found')
  return r.json()
})

function groupByDay(activities: Activity[]): Map<number, Activity[]> {
  const map = new Map<number, Activity[]>()
  for (const act of activities) {
    const list = map.get(act.day_number) ?? []
    list.push(act)
    map.set(act.day_number, list)
  }
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

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [formDay, setFormDay] = useState<number>(1)
  const [mapPins, setMapPins] = useState<MapPin[]>([])
  const [geocodingProgress, setGeocodingProgress] = useState(0)
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list')

  // Drag-to-resize
  const [leftPct, setLeftPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPct(Math.min(Math.max(pct, 25), 75))
  }, [])

  const stopDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }
  }, [onMouseMove, stopDrag])

  function startDrag() {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Sequential geocoding — avoids Nominatim rate limits
  useEffect(() => {
    if (!data?.activities) return
    const activities = data.activities.filter(a => a.location)
    if (activities.length === 0) return

    setMapPins([])
    setGeocodingProgress(1) // signal that geocoding has started

    let cancelled = false

    async function resolveSequentially() {
      const results: MapPin[] = []
      for (let i = 0; i < activities.length; i++) {
        if (cancelled) return
        const act = activities[i]
        const coords = await resolveActivityCoordinates(act, data!.destination ?? null)
        if (coords) {
          const pin: MapPin = {
            id: act.id,
            name: act.name,
            day: act.day_number,
            lng: coords.lng,
            lat: coords.lat,
            type: (act.activity_type === 'hotel' ? 'hotel' : 'activity') as 'activity' | 'hotel',
            sequenceNumber: i + 1,
          }
          results.push(pin)
          if (!cancelled) setMapPins([...results]) // update incrementally
        }
        setGeocodingProgress(Math.round(((i + 1) / activities.length) * 100))
        // Small delay between requests to respect Nominatim rate limit (1 req/sec)
        if (i < activities.length - 1 && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
          await new Promise(r => setTimeout(r, 250))
        }
      }
    }

    resolveSequentially()
    return () => { cancelled = true }
  }, [data?.activities, data?.destination]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEditTitle() {
    setTitleDraft(data?.title ?? '')
    setEditingTitle(true)
  }

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === data?.title) { setEditingTitle(false); return }
    setEditingTitle(false)
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft.trim() }),
    })
    mutate()
  }

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

  function handlePinClick(pinId: string) {
    setActiveActivityId(pinId)
    document.getElementById(`activity-${pinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleDayChange(day: number) {
    setActiveDay(day === 0 ? null : day)
  }

  async function handleDeleteItinerary() {
    const confirmed = window.confirm(`Delete "${data?.title}"? This cannot be undone.`)
    if (!confirmed) return
    await fetch(`/api/itineraries/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4"><SkeletonText lines={2} /><SkeletonText lines={4} /></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-6">
        <ErrorMessage message="Itinerary not found or failed to load." onRetry={() => mutate()} />
      </div>
    )
  }

  const dayMap = groupByDay(data.activities ?? [])
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)
  if (sortedDays.length === 0) sortedDays.push(1)
  const displayedDays = activeDay ? sortedDays.filter(d => d === activeDay) : sortedDays
  const dateRange = data.start_date && data.end_date ? `${data.start_date} – ${data.end_date}` : data.start_date ?? null
  const hasLocations = (data.activities ?? []).some(a => a.location)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f0ebe4]">
      {/* Hero strip */}
      <ItineraryHero
        title={data.title}
        coverImageUrl={data.cover_image_url ?? null}
        destination={data.destination}
        dateRange={dateRange}
        onBack={() => router.push('/dashboard')}
        onDelete={handleDeleteItinerary}
        onEditTitle={startEditTitle}
        editingTitle={editingTitle}
        titleDraft={titleDraft}
        onTitleDraftChange={setTitleDraft}
        onTitleSave={saveTitle}
      />

      {/* Mobile tab toggle */}
      <div className="md:hidden flex border-b border-sky/40 bg-white/90 backdrop-blur-sm shrink-0">
        {(['list', 'map'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="relative flex-1 py-2.5 text-xs font-semibold text-umber capitalize tracking-wide"
          >
            {mobileTab === tab && (
              <motion.div layoutId="mobile-tab-indicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full" />
            )}
            {tab === 'list' ? 'Itinerary' : 'Map'}
          </button>
        ))}
      </div>

      {/* Resizable split layout */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* Left: scrollable activity list */}
        <div
          className={`${mobileTab === 'map' ? 'hidden' : 'flex flex-col'} md:flex md:flex-col overflow-hidden`}
          style={{ width: `${leftPct}%` }}
        >
          {/* Sticky day pill strip */}
          <div className="shrink-0 px-3 md:px-4 py-2 bg-white/80 backdrop-blur-md border-b border-sky/20">
            <DayPillNav days={sortedDays} activeDay={activeDay} onDayChange={handleDayChange} />
            {geocodingProgress > 0 && geocodingProgress < 100 && (
              <div className="mt-1.5 h-px bg-sky/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-coral rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${geocodingProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-2 md:px-3 py-3">
            <AnimatePresence mode="popLayout">
              {displayedDays.map(dayNumber => (
                <motion.div
                  key={dayNumber}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <DaySection
                    dayNumber={dayNumber}
                    activities={dayMap.get(dayNumber) ?? []}
                    activeActivityId={activeActivityId}
                    onActivityClick={handlePinClick}
                    onAddActivity={openAddActivity}
                    onEditActivity={openEditActivity}
                    onDeleteActivity={handleDeleteActivity}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Drag handle */}
        <div
          className="hidden md:flex relative shrink-0 w-[5px] cursor-col-resize items-center justify-center group"
          onMouseDown={startDrag}
          style={{ background: 'rgba(204,217,226,0.3)' }}
        >
          <div
            className="absolute inset-y-0 w-px transition-colors duration-150"
            style={{ background: 'rgba(204,217,226,0.6)', left: '2px' }}
          />
          {/* Grab pill */}
          <div
            className="relative z-10 flex flex-col gap-[3px] items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1 py-2 rounded-full"
            style={{ background: 'rgba(214,121,64,0.12)' }}
          >
            {[0,1,2,3].map(i => (
              <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: '#D67940', opacity: 0.7 }} />
            ))}
          </div>
        </div>

        {/* Right: map */}
        <div
          className={`${mobileTab === 'list' ? 'hidden' : 'flex-1'} md:flex md:flex-col relative`}
          style={{ width: `${100 - leftPct}%` }}
        >
          <ItineraryMap
            pins={mapPins}
            activeDay={activeDay}
            activeActivityId={activeActivityId}
            onPinClick={handlePinClick}
            hasLocations={hasLocations}
          />
        </div>
      </div>

      {/* Activity form modal */}
      <AnimatePresence>
        {activityFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setActivityFormOpen(false); setEditingActivity(null) } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full max-w-lg"
            >
              <ActivityForm
                initialData={editingActivity ?? undefined}
                dayNumber={formDay}
                itineraryId={id}
                onSave={handleSaveActivity}
                onCancel={() => { setActivityFormOpen(false); setEditingActivity(null) }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
