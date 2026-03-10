import { ActivityRow } from './ActivityRow'
import type { Activity } from '@/lib/types'

interface DaySectionProps {
  dayNumber: number
  activities: Activity[]
  onAddActivity: (dayNumber: number) => void
  onEditActivity: (activity: Activity) => void
  onDeleteActivity: (id: string) => Promise<void>
}

export function DaySection({ dayNumber, activities, onAddActivity, onEditActivity, onDeleteActivity }: DaySectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-700 mb-3 sticky top-16 bg-gray-50 py-2 z-10 flex items-center justify-between">
        <span>Day {dayNumber}</span>
        <span className="text-xs text-gray-400 font-normal">{activities.length} activities</span>
      </h2>
      <div className="space-y-3">
        {activities.map(activity => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            onEdit={onEditActivity}
            onDelete={onDeleteActivity}
          />
        ))}
      </div>
      <button
        onClick={() => onAddActivity(dayNumber)}
        className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
      >
        + Add activity
      </button>
    </section>
  )
}
