import { ActivityCard } from './ActivityCard'
import { HotelCard } from './HotelCard'
import type { Activity } from '@/lib/types'

interface DaySectionProps {
  dayNumber: number
  activities: Activity[]
  activeActivityId: string | null
  onActivityClick: (id: string) => void
  onAddActivity: (dayNumber: number) => void
  onEditActivity: (activity: Activity) => void
  onDeleteActivity: (id: string) => Promise<void>
  sequenceOffset?: number
}

export function DaySection({
  dayNumber,
  activities,
  activeActivityId,
  onActivityClick,
  onAddActivity,
  sequenceOffset = 0,
}: DaySectionProps) {
  return (
    <section className="mb-8">
      {/* Day header with coral left border accent */}
      <h2 className="font-serif text-lg text-navy border-l-4 border-coral pl-3 mb-4">
        Day {dayNumber}
      </h2>

      {/* Timeline with dashed vertical line */}
      <div className="border-l-2 border-dashed border-sky ml-4 pl-4 space-y-3">
        {activities.map((activity, index) => {
          const isActive = activeActivityId === activity.id
          const handleClick = () => onActivityClick(activity.id)

          if (activity.activity_type === 'hotel') {
            return (
              <div key={activity.id} id={`activity-${activity.id}`}>
                <HotelCard
                  activity={activity}
                  isActive={isActive}
                  onCardClick={handleClick}
                />
              </div>
            )
          }

          return (
            <div key={activity.id} id={`activity-${activity.id}`}>
              <ActivityCard
                activity={activity}
                isActive={isActive}
                sequenceNumber={index + 1 + sequenceOffset}
                onCardClick={handleClick}
              />
            </div>
          )
        })}
      </div>

      {/* Add activity button */}
      <button
        onClick={() => onAddActivity(dayNumber)}
        className="mt-3 ml-4 w-[calc(100%-1rem)] py-2 border border-dashed border-sky rounded-xl text-sm text-umber/60 hover:text-umber hover:border-coral transition-colors"
      >
        + Add activity
      </button>
    </section>
  )
}
