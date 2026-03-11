import { motion } from 'motion/react'
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
}: DaySectionProps) {
  return (
    <section className="mb-5">
      {/* Compact day header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] font-bold text-coral tracking-[0.2em] uppercase">
          Day {dayNumber}
        </span>
        <div className="flex-1 h-px bg-sky/40" />
      </div>

      {/* Timeline: relative container holds the vertical line + items */}
      <div className="relative pl-6">
        {/* Continuous vertical line spanning all activities */}
        {activities.length > 0 && (
          <div
            className="absolute left-[7px] top-3 w-px bg-sky/50"
            style={{ bottom: activities.length > 1 ? '0.75rem' : '3rem' }}
          />
        )}

        {activities.map((activity, index) => {
          const isActive = activeActivityId === activity.id
          const isHotel = activity.activity_type === 'hotel'
          const isLast = index === activities.length - 1

          return (
            <motion.div
              key={activity.id}
              id={`activity-${activity.id}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.18 }}
              className={`relative mb-0.5 ${isLast ? 'mb-2' : ''}`}
            >
              {/* Timeline dot */}
              <div
                className={`
                  absolute -left-6 top-[13px] w-[10px] h-[10px] rounded-full border-[1.5px] z-10 transition-all duration-200
                  ${isHotel
                    ? 'bg-navy border-navy'
                    : isActive
                      ? 'bg-coral border-coral scale-125'
                      : 'bg-white border-sky/70'
                  }
                `}
              />

              {/* Row */}
              <button
                onClick={() => onActivityClick(activity.id)}
                className={`
                  w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150
                  ${isActive
                    ? 'bg-white shadow-sm shadow-navy/8'
                    : 'hover:bg-white/70'
                  }
                `}
              >
                {/* Icon for hotel, nothing for activity */}
                {isHotel && (
                  <div className="w-6 h-6 rounded-lg bg-navy/90 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M3 21V8l9-6 9 6v13" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M9 21V15h6v6" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate leading-snug ${isActive ? 'text-navy' : 'text-navy/90'}`}>
                    {isHotel ? (activity.extra_data as Record<string, unknown> | null)?.hotel_name as string ?? activity.name : activity.name}
                  </p>
                  {activity.location && (
                    <p className="text-[11px] text-umber/55 truncate flex items-center gap-1 mt-0.5">
                      <span className="opacity-70">📍</span>
                      {activity.location}
                    </p>
                  )}
                </div>

                {/* Time / hotel badge */}
                {isHotel ? (
                  <span className="text-[10px] font-semibold text-navy/50 bg-navy/8 px-2 py-0.5 rounded-full shrink-0 tracking-wide">
                    Stay
                  </span>
                ) : activity.time ? (
                  <span className={`
                    text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0
                    ${isActive ? 'bg-coral text-white' : 'text-coral'}
                  `}>
                    {activity.time}
                  </span>
                ) : null}
              </button>
            </motion.div>
          )
        })}

        {/* Add activity */}
        <button
          onClick={() => onAddActivity(dayNumber)}
          className="relative w-full text-left px-3 py-1.5 text-xs text-umber/40 hover:text-coral transition-colors flex items-center gap-2"
        >
          {/* Dot for the add button */}
          <div className="absolute -left-6 top-[9px] w-[10px] h-[10px] rounded-full border border-dashed border-sky/40" />
          + Add activity
        </button>
      </div>
    </section>
  )
}
