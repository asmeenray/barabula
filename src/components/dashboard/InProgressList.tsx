import Link from 'next/link'
import type { TripSessionSummary } from '@/lib/types'

interface InProgressListProps {
  sessions: TripSessionSummary[]
}

// D-09: temporary "In progress" list until phase 16's Trips tab. Reuses dashboard card classes.
export function InProgressList({ sessions }: InProgressListProps) {
  if (sessions.length === 0) return null

  return (
    <section className="mb-8" aria-labelledby="in-progress-heading">
      <h2 id="in-progress-heading" className="text-sm font-semibold text-gray-900 mb-3">
        In progress
      </h2>
      <ul className="flex flex-col gap-2">
        {sessions.map(session => {
          const destination = session.trip_state?.destination?.trim()
          return (
            <li key={session.id}>
              <Link
                href={`/chat?session=${session.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow group"
              >
                <span className="font-medium text-gray-900 text-sm group-hover:text-navy transition-colors">
                  {destination || 'New trip'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(session.updated_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
