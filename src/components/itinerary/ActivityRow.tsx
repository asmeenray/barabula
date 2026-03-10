import type { Activity } from '@/lib/types'

interface ActivityRowProps {
  activity: Activity
  onEdit: (activity: Activity) => void
  onDelete: (id: string) => Promise<void>
}

export function ActivityRow({ activity, onEdit, onDelete }: ActivityRowProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{activity.name}</p>
          {activity.time && (
            <p className="text-sm text-blue-600 mt-0.5">{activity.time}</p>
          )}
          {activity.location && (
            <p className="text-sm text-gray-500 mt-1">📍 {activity.location}</p>
          )}
          {activity.description && (
            <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(activity)}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded transition-colors"
            aria-label={`Edit ${activity.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(activity.id)}
            className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded transition-colors"
            aria-label={`Delete ${activity.name}`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
