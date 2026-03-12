'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react'
import { DaySection } from '@/components/itinerary/DaySection'
import { DayPillNav } from '@/components/itinerary/DayPillNav'
import { ItineraryHero } from '@/components/itinerary/ItineraryHero'
import { ActivityForm } from '@/components/itinerary/ActivityForm'
import { FlightCard } from '@/components/itinerary/FlightCard'
import { EatDrinkTab } from '@/components/itinerary/EatDrinkTab'
import { SkeletonText } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { resolveActivityCoordinates } from '@/lib/geocoding'
import type { Activity, Itinerary, Flight, DailyFood } from '@/lib/types'
import type { MapPin } from '@/components/itinerary/ItineraryMap'

const ItineraryMap = dynamic(() => import('@/components/itinerary/ItineraryMap'), { ssr: false })

type ItineraryWithActivities = Itinerary & {
  activities: Activity[]
  cover_image_url?: string | null
  extra_data?: { flights?: Flight[]; daily_food?: DailyFood[] } | null
  is_public?: boolean
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
    // Parse 12-hour clock: "9:00 AM", "12:30 PM", "1:00 PM"
    const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const period = match[3].toUpperCase()
      if (period === 'AM' && hours === 12) hours = 0
      if (period === 'PM' && hours !== 12) hours += 12
      return hours * 60 + minutes
    }
    // Fallback for 24h format "09:00"
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
  const searchParams = useSearchParams()
  const isShareMode = searchParams.get('share') === 'true'

  const { data, error, isLoading, mutate } = useSWR<ItineraryWithActivities>(
    `/api/itineraries/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,      // Don't refetch when user switches tabs
      dedupingInterval: 30_000,      // Dedupe requests within 30s
      revalidateOnReconnect: false,  // Don't refetch on network reconnect
    }
  )

  const [showMap, setShowMap] = useState(false)
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
  const [mainTab, setMainTab] = useState<'itinerary' | 'eat-drink'>('itinerary')

  // Share state
  const [isPublic, setIsPublic] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  // Guest CTA banner dismissed state (persisted via sessionStorage)
  const [ctaBannerVisible, setCtaBannerVisible] = useState(false)

  // Drag-to-resize
  const [leftPct, setLeftPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Sync isPublic from loaded data
  useEffect(() => {
    if (data) setIsPublic(data.is_public === true)
  }, [data])

  // Initialize CTA banner visibility from sessionStorage
  useEffect(() => {
    if (!isShareMode) return
    const dismissed = sessionStorage.getItem('share-cta-dismissed') === 'true'
    if (!dismissed) {
      // Small delay for slide-up entrance animation
      const timer = setTimeout(() => setCtaBannerVisible(true), 300)
      return () => clearTimeout(timer)
    }
  }, [isShareMode])

  const dismissCtaBanner = useCallback(() => {
    setCtaBannerVisible(false)
    sessionStorage.setItem('share-cta-dismissed', 'true')
  }, [])

  const handleShare = useCallback(async () => {
    if (!data) return
    const newPublic = !isPublic
    // Optimistic update
    setIsPublic(newPublic)
    try {
      await fetch(`/api/itineraries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: newPublic }),
      })
      if (newPublic) {
        const shareUrl = `${window.location.origin}/itinerary/${id}?share=true`
        await navigator.clipboard.writeText(shareUrl)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 3000)
      }
    } catch {
      setIsPublic(!newPublic) // rollback on error
    }
  }, [data, id, isPublic])

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

  const handleToggleMap = useCallback(() => {
    setShowMap(prev => {
      const next = !prev
      if (!next) {
        setMapPins([])
        setGeocodingProgress(0)
        setMobileTab('list')
      } else {
        setMobileTab('map')
      }
      return next
    })
  }, [])

  // Sequential geocoding — avoids Nominatim rate limits (lazy: only runs when showMap is true)
  useEffect(() => {
    if (!showMap || !data?.activities) return
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
  }, [showMap, data?.activities, data?.destination]) // eslint-disable-line react-hooks/exhaustive-deps

  const startEditTitle = useCallback(() => {
    setTitleDraft(data?.title ?? '')
    setEditingTitle(true)
  }, [data?.title])

  const saveTitle = useCallback(async () => {
    if (!titleDraft.trim() || titleDraft === data?.title) { setEditingTitle(false); return }
    setEditingTitle(false)
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft.trim() }),
    })
    mutate()
  }, [id, titleDraft, data?.title, mutate])

  const openAddActivity = useCallback((dayNumber: number) => {
    if (isShareMode) return
    setEditingActivity(null)
    setFormDay(dayNumber)
    setActivityFormOpen(true)
  }, [isShareMode])

  const openEditActivity = useCallback((activity: Activity) => {
    if (isShareMode) return
    setEditingActivity(activity)
    setFormDay(activity.day_number)
    setActivityFormOpen(true)
  }, [isShareMode])

  const handleSaveActivity = useCallback(async (actData: Omit<Activity, 'id' | 'activity_type'>) => {
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
  }, [editingActivity, mutate])

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    await fetch(`/api/activities/${activityId}`, { method: 'DELETE' })
    mutate()
  }, [mutate])

  const handlePinClick = useCallback((pinId: string) => {
    setActiveActivityId(pinId)
    document.getElementById(`activity-${pinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const handleDayChange = useCallback((day: number) => {
    setActiveDay(day === 0 ? null : day)
  }, [])

  const handleDeleteItinerary = useCallback(async () => {
    const confirmed = window.confirm(`Delete "${data?.title}"? This cannot be undone.`)
    if (!confirmed) return
    await fetch(`/api/itineraries/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }, [data?.title, id, router])

  const handleBack = useCallback(() => router.push('/dashboard'), [router])

  const handleContinuePlanning = useCallback(() => {
    router.push('/chat')
  }, [router])

  const handleSaveFlight = useCallback(async (updated: Flight) => {
    const flights = data?.extra_data?.flights ?? []
    const updatedFlights = flights.map(f =>
      f.direction === updated.direction ? updated : f
    )
    const existing = (data?.extra_data ?? {}) as Record<string, unknown>
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_data: { ...existing, flights: updatedFlights } }),
    })
    mutate()
  }, [data?.extra_data, id, mutate])

  const handleSaveDailyFood = useCallback(async (updatedFood: DailyFood[]) => {
    const existing = (data?.extra_data ?? {}) as Record<string, unknown>
    await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_data: { ...existing, daily_food: updatedFood } }),
    })
    mutate()
  }, [data?.extra_data, id, mutate])

  const handleSetMobileTab = useCallback((tab: 'list' | 'map') => {
    setMobileTab(tab)
  }, [])

  const handleCloseActivityForm = useCallback(() => {
    setActivityFormOpen(false)
    setEditingActivity(null)
  }, [])

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setActivityFormOpen(false)
      setEditingActivity(null)
    }
  }, [])

  // Memoized derived state — only recalculates when data.activities changes
  const dayMap = useMemo(
    () => groupByDay(data?.activities ?? []),
    [data?.activities]
  )
  const sortedDays = useMemo(() => {
    const days = Array.from(dayMap.keys()).sort((a, b) => a - b)
    return days.length === 0 ? [1] : days
  }, [dayMap])
  const displayedDays = useMemo(
    () => (activeDay ? sortedDays.filter(d => d === activeDay) : sortedDays),
    [activeDay, sortedDays]
  )
  const dateRange = useMemo(
    () => data?.start_date && data?.end_date ? `${data.start_date} – ${data.end_date}` : data?.start_date ?? null,
    [data?.start_date, data?.end_date]
  )
  const hasLocations = useMemo(
    () => (data?.activities ?? []).some(a => a.location),
    [data?.activities]
  )

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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f0ebe4]">
      {/* Hero strip */}
      <ItineraryHero
        title={data.title}
        coverImageUrl={data.cover_image_url ?? null}
        destination={data.destination}
        dateRange={dateRange}
        onBack={handleBack}
        onDelete={handleDeleteItinerary}
        onEditTitle={startEditTitle}
        editingTitle={editingTitle}
        titleDraft={titleDraft}
        onTitleDraftChange={setTitleDraft}
        onTitleSave={saveTitle}
        showMap={showMap}
        onToggleMap={handleToggleMap}
        isShareMode={isShareMode}
        isPublic={isPublic}
        onShare={handleShare}
        onContinuePlanning={isShareMode ? undefined : handleContinuePlanning}
      />

      {/* Mobile tab toggle — only shown when map is visible */}
      {showMap && (
        <div className="md:hidden flex border-b border-sky/40 bg-white/90 backdrop-blur-sm shrink-0">
          {(['list', 'map'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleSetMobileTab(tab)}
              className="relative flex-1 py-2.5 text-xs font-semibold text-umber capitalize tracking-wide"
            >
              {mobileTab === tab && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full" />
              )}
              {tab === 'list' ? 'Itinerary' : 'Map'}
            </button>
          ))}
        </div>
      )}

      {/* Conditional layout: full-width list (default) or split with map */}
      {showMap ? (
        /* Split layout — map visible */
        <div ref={containerRef} className="flex flex-1 overflow-hidden">

          {/* Left: scrollable activity list */}
          <div
            className={`${mobileTab === 'map' ? 'hidden' : 'flex flex-col'} md:flex md:flex-col overflow-hidden`}
            style={{ width: `${leftPct}%` }}
          >
            {/* Main tab bar — Itinerary / Eat & Drink */}
            <div className="shrink-0 flex border-b border-sky/20 bg-white/80 backdrop-blur-md">
              {(['itinerary', 'eat-drink'] as const).map(tab => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  className="relative flex-1 py-2.5 text-xs font-semibold text-umber tracking-wide">
                  {mainTab === tab && (
                    <motion.div layoutId="main-tab-indicator-split"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full" />
                  )}
                  {tab === 'itinerary' ? 'Itinerary' : 'Eat & Drink'}
                </button>
              ))}
            </div>

            {/* Sticky day pill strip — only shown for itinerary tab */}
            {mainTab === 'itinerary' && (
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
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2 md:px-3 py-3">
              {mainTab === 'itinerary' ? (
                <>
                  {/* Outbound flight cards */}
                  {(data.extra_data?.flights ?? []).filter(f => f.direction === 'outbound').map((flight, i) => (
                    <FlightCard key={`outbound-${i}`} flight={flight} onSave={handleSaveFlight} />
                  ))}
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
                          isShareMode={isShareMode}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {/* Return flight cards */}
                  {(data.extra_data?.flights ?? []).filter(f => f.direction === 'return').map((flight, i) => (
                    <FlightCard key={`return-${i}`} flight={flight} onSave={handleSaveFlight} />
                  ))}
                </>
              ) : (
                <EatDrinkTab
                  dailyFood={data.extra_data?.daily_food ?? []}
                  itineraryId={id}
                  onSave={handleSaveDailyFood}
                />
              )}
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

          {/* Right: map — only mounted when showMap === true */}
          <div
            className={`${mobileTab === 'list' ? 'hidden' : 'flex-1'} md:flex md:flex-col relative`}
            style={{ width: `${100 - leftPct}%` }}
          >
            {showMap && (
              <ItineraryMap
                pins={mapPins}
                activeDay={activeDay}
                activeActivityId={activeActivityId}
                onPinClick={handlePinClick}
                hasLocations={hasLocations}
              />
            )}
          </div>
        </div>
      ) : (
        /* Full-width layout — map hidden (default) */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Main tab bar — Itinerary / Eat & Drink */}
          <div className="shrink-0 flex border-b border-sky/20 bg-white/80 backdrop-blur-md">
            {(['itinerary', 'eat-drink'] as const).map(tab => (
              <button key={tab} onClick={() => setMainTab(tab)}
                className="relative flex-1 py-2.5 text-xs font-semibold text-umber tracking-wide">
                {mainTab === tab && (
                  <motion.div layoutId="main-tab-indicator"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full" />
                )}
                {tab === 'itinerary' ? 'Itinerary' : 'Eat & Drink'}
              </button>
            ))}
          </div>

          {/* Sticky day pill strip — only shown for itinerary tab */}
          {mainTab === 'itinerary' && (
            <div className="shrink-0 px-3 md:px-4 py-2 bg-white/80 backdrop-blur-md border-b border-sky/20">
              <DayPillNav days={sortedDays} activeDay={activeDay} onDayChange={handleDayChange} />
            </div>
          )}

          {/* Full-width scrollable content */}
          <div
            className="flex-1 overflow-y-auto px-3 md:px-6 py-4 max-w-3xl mx-auto w-full"
            style={isShareMode ? { paddingBottom: '88px' } : undefined}
          >
            {mainTab === 'itinerary' ? (
              <>
                {/* Outbound flight cards */}
                {(data.extra_data?.flights ?? []).filter(f => f.direction === 'outbound').map((flight, i) => (
                  <FlightCard key={`outbound-${i}`} flight={flight} onSave={handleSaveFlight} />
                ))}
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
                        isShareMode={isShareMode}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {/* Return flight cards */}
                {(data.extra_data?.flights ?? []).filter(f => f.direction === 'return').map((flight, i) => (
                  <FlightCard key={`return-${i}`} flight={flight} onSave={handleSaveFlight} />
                ))}
              </>
            ) : (
              <EatDrinkTab
                dailyFood={data.extra_data?.daily_food ?? []}
                itineraryId={id}
                onSave={handleSaveDailyFood}
              />
            )}
          </div>
        </div>
      )}

      {/* Activity form modal — blocked in share mode */}
      <AnimatePresence>
        {activityFormOpen && !isShareMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={handleOverlayClick}
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
                onCancel={handleCloseActivityForm}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Chat again" FAB — mobile only (md:hidden). Routes user back to chat for trip refinement. */}
      <button
        onClick={() => router.push('/chat')}
        className={[
          'fixed z-40 md:hidden',
          'flex items-center gap-2',
          'bg-coral text-white text-sm font-semibold rounded-full px-4 py-3',
          'shadow-lg active:scale-95 transition-transform duration-100',
          'right-5',
          isShareMode && ctaBannerVisible ? 'bottom-[96px]' : 'bottom-6',
        ].join(' ')}
        style={{
          boxShadow: '0 4px 16px rgba(214,121,64,0.35)',
          bottom: isShareMode && ctaBannerVisible
            ? 'calc(6rem + env(safe-area-inset-bottom, 0px))'
            : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Chat again to refine your trip"
      >
        {/* Inline chat SVG — lucide-react not installed in project */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Chat again
      </button>

      {/* Share toast — "Link copied" confirmation */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg z-50"
            style={{ background: 'rgba(40,81,133,0.95)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}
          >
            Link copied — anyone with this link can view your trip
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest acquisition CTA banner — shown in share mode */}
      <AnimatePresence>
        {isShareMode && ctaBannerVisible && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{
              background: 'linear-gradient(135deg, #285185 0%, #1c2c40 60%, #2a3d5a 100%)',
              borderTop: '1px solid rgba(214,121,64,0.3)',
              backgroundSize: '200% 200%',
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            <div className="relative px-5 py-4 flex items-center justify-between gap-4 max-w-3xl mx-auto">
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-snug" style={{ color: '#F5EDE3' }}>
                  Planning your own adventure?
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(245,237,227,0.6)' }}>
                  Build trips like this with{' '}
                  <span className="font-logo" style={{ color: '#D67940', fontSize: '13px' }}>Barabula.</span>
                  {' '}— free, AI-powered.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
                  style={{
                    background: '#D67940',
                    boxShadow: '0 2px 10px rgba(214,121,64,0.35)',
                  }}
                >
                  Sign up free
                </a>
                <a
                  href="/"
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 hover:opacity-80"
                  style={{
                    color: 'rgba(245,237,227,0.75)',
                    border: '1px solid rgba(245,237,227,0.2)',
                  }}
                >
                  See how it works
                </a>
                <button
                  onClick={dismissCtaBanner}
                  aria-label="Dismiss"
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 hover:opacity-70"
                  style={{ color: 'rgba(245,237,227,0.4)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS keyframes for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
