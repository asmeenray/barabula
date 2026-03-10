import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-6" role="img" aria-label="World map">🗺️</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">
        Describe your dream trip to the AI or create one manually to get started.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/chat"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Start a trip in Chat →
        </Link>
        <Link
          href="/itinerary/new"
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          + Create manually
        </Link>
      </div>
    </div>
  )
}
