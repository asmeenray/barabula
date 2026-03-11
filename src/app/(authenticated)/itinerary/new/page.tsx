'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewItineraryPage() {
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Trip title is required')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          destination: destination.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create itinerary')
        setSubmitting(false)
        return
      }
      router.push(`/itinerary/${data.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="py-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Trip</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Trip Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Tokyo Spring Adventure"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="e.g. Tokyo, Japan"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-umber disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  )
}
