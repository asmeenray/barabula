import { motion } from 'motion/react'
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
      {/* Day header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">{dayNumber}</span>
        </div>
        <h2 className="font-serif text-base text-navy">Day {dayNumber}</h2>
        <div className="flex-1 h-px bg-sky/40" />
      </div>

      {/* Activity cards */}
      <motion.div
        className="space-y-2.5 pl-1"
        initial={false}
      >
        {activities.map((activity, index) => {
          const isActive = activeActivityId === activity.id
          const handleClick = () => onActivityClick(activity.id)

          return (
            <motion.div
              key={activity.id}
              id={`activity-${activity.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
            >
              {activity.activity_type === 'hotel' ? (
                <HotelCard activity={activity} isActive={isActive} onCardClick={handleClick} />
              ) : (
                <ActivityCard
                  activity={activity}
                  isActive={isActive}
                  sequenceNumber={index + 1 + sequenceOffset}
                  onCardClick={handleClick}
                />
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Add activity */}
      <button
        onClick={() => onAddActivity(dayNumber)}
        className="mt-3 w-full py-2.5 rounded-xl text-sm text-umber/50 hover:text-coral hover:bg-coral/5 border border-dashed border-sky/50 hover:border-coral/30 transition-all duration-200"
      >
        + Add activity
      </button>
    </section>
  )
}
