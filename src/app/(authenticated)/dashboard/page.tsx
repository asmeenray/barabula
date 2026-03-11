'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ItineraryCard } from '@/components/dashboard/ItineraryCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { SkeletonGrid } from '@/components/ui/Skeleton'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { Itinerary } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to load')
  return r.json()
})

export default function DashboardPage() {
  const { data: itineraries, error, isLoading, mutate } = useSWR<Itinerary[]>(
    '/api/itineraries',
    fetcher
  )
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  async function handleDelete(id: string) {
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/itineraries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await mutate()  // Re-fetch from server — no optimistic update per decision
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <Link
          href="/itinerary/new"
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-xl hover:bg-coral-light transition-colors"
        >
          + New Trip
        </Link>
      </div>

      {/* Content states */}
      {isLoading && <SkeletonGrid />}

      {error && (
        <ErrorMessage
          message="Failed to load your itineraries."
          onRetry={() => mutate()}
        />
      )}

      {!isLoading && !error && (!itineraries || itineraries.length === 0) && (
        <EmptyState />
      )}

      {!isLoading && !error && itineraries && itineraries.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="itinerary-grid"
        >
          {itineraries.map(itin => (
            <ItineraryCard
              key={itin.id}
              itinerary={itin}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(itin.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
