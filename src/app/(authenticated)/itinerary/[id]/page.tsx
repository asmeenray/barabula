'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { DaySection } from '@/components/itinerary/DaySection'
import { ActivityForm } from '@/components/itinerary/ActivityForm'
import { SkeletonText } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { Activity, Itinerary } from '@/lib/types'

type ItineraryWithActivities = Itinerary & { activities: Activity[] }

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
  // Sort each day's activities by time string (lexicographic, sufficient for HH:MM format)
  for (const [day, acts] of map) {
    map.set(day, acts.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))
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

  // Inline edit state for title and description
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')

  // Activity form modal state
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [activeDay, setActiveDay] = useState<number>(1)

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
    setActiveDay(dayNumber)
    setActivityFormOpen(true)
  }

  function openEditActivity(activity: Activity) {
    setEditingActivity(activity)
    setActiveDay(activity.day_number)
    setActivityFormOpen(true)
  }

  async function handleSaveActivity(actData: Omit<Activity, 'id' | 'activity_type'>) {
    if (editingActivity) {
      // Update existing
      await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData),
      })
    } else {
      // Create new
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

  const dateRange = data.start_date && data.end_date
    ? `${data.start_date} – ${data.end_date}`
    : data.start_date ?? null

  return (
    <div className="py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm" data-testid="itinerary-header">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Inline-editable title */}
            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
                className="text-2xl font-bold text-gray-900 w-full border-b-2 border-blue-500 bg-transparent focus:outline-none"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-700 transition-colors"
                onClick={startEditTitle}
                title="Click to edit title"
              >
                {data.title}
              </h1>
            )}

            {data.destination && (
              <p className="text-sm font-medium text-blue-600 mt-1">{data.destination}</p>
            )}
            {dateRange && (
              <p className="text-xs text-gray-500 mt-0.5">{dateRange}</p>
            )}

            {/* Inline-editable description */}
            <div className="mt-3">
              {editingDescription ? (
                <textarea
                  value={descriptionDraft}
                  onChange={e => setDescriptionDraft(e.target.value)}
                  onBlur={saveDescription}
                  rows={3}
                  className="w-full text-sm text-gray-600 border border-gray-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <p
                  className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                  onClick={startEditDescription}
                  title="Click to edit description"
                >
                  {data.description || (
                    <span className="text-gray-400 italic">Add a description...</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleDeleteItinerary}
            className="text-xs text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors shrink-0"
          >
            Delete Trip
          </button>
        </div>
      </div>

      {/* Day sections */}
      {sortedDays.map(dayNumber => (
        <DaySection
          key={dayNumber}
          dayNumber={dayNumber}
          activities={dayMap.get(dayNumber) ?? []}
          onAddActivity={openAddActivity}
          onEditActivity={openEditActivity}
          onDeleteActivity={handleDeleteActivity}
        />
      ))}

      {/* Activity form modal */}
      {activityFormOpen && (
        <ActivityForm
          initialData={editingActivity ?? undefined}
          dayNumber={activeDay}
          itineraryId={id}
          onSave={handleSaveActivity}
          onCancel={() => { setActivityFormOpen(false); setEditingActivity(null) }}
        />
      )}
    </div>
  )
}
