'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/types'

interface ActivityFormProps {
  initialData?: Partial<Activity>
  dayNumber: number
  itineraryId: string
  onSave: (data: Omit<Activity, 'id' | 'activity_type'>) => Promise<void>
  onCancel: () => void
}

export function ActivityForm({ initialData, dayNumber, itineraryId, onSave, onCancel }: ActivityFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [time, setTime] = useState(initialData?.time ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [duration, setDuration] = useState(initialData?.duration ?? '')
  const [tips, setTips] = useState(initialData?.tips ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Activity name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        itinerary_id: itineraryId,
        day_number: dayNumber,
        name: name.trim(),
        time: time.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        extra_data: null,
        duration: duration.trim() || null,
        tips: tips.trim() || null,
      })
    } catch {
      setError('Failed to save activity. Please try again.')
      setSaving(false)
    }
  }

  return (
    // Modal overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {initialData?.id ? 'Edit Activity' : 'Add Activity'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Visit Senso-ji Temple"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Time</label>
            <input
              type="text"
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="e.g. 09:00 or Morning"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Asakusa, Tokyo"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What to do or see here..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Duration</label>
            <input
              type="text"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 2–3 hours"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tips (optional)</label>
            <textarea
              value={tips}
              onChange={e => setTips(e.target.value)}
              placeholder="e.g. Book tickets online 2 weeks ahead"
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-umber disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
