import Link from 'next/link'
import type { Itinerary } from '@/lib/types'

interface ItineraryCardProps {
  itinerary: Itinerary
  onDelete: (id: string) => Promise<void>
  isDeleting: boolean
}

export function ItineraryCard({ itinerary, onDelete, isDeleting }: ItineraryCardProps) {
  const dateRange = itinerary.start_date && itinerary.end_date
    ? `${itinerary.start_date} – ${itinerary.end_date}`
    : itinerary.start_date ?? null

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const confirmed = window.confirm(`Delete "${itinerary.title}"? This cannot be undone.`)
    if (confirmed) {
      await onDelete(itinerary.id)
    }
  }

  return (
    <Link
      href={`/itinerary/${itinerary.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1">
          {itinerary.destination && (
            <p className="text-xs font-medium text-coral uppercase tracking-wide mb-1">
              {itinerary.destination}
            </p>
          )}
          <h3 className="font-semibold text-gray-900 text-base leading-snug group-hover:text-navy transition-colors">
            {itinerary.title}
          </h3>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange}</p>
          )}
          {itinerary.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{itinerary.description}</p>
          )}
        </div>

        <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Link>
  )
}
