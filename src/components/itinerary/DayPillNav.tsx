'use client'
import { motion } from 'motion/react'

interface DayPillNavProps {
  days: number[]
  activeDay: number | null
  onDayChange: (day: number) => void
}

export function DayPillNav({ days, activeDay, onDayChange }: DayPillNavProps) {
  const isAllActive = activeDay === null || activeDay === 0

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* All Days pill */}
      <button
        onClick={() => onDayChange(0)}
        className="relative shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
      >
        {isAllActive && (
          <motion.div
            layoutId="day-pill-active"
            className="absolute inset-0 bg-navy rounded-full"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
        <span className={`relative z-10 ${isAllActive ? 'text-white' : 'text-umber hover:text-navy'}`}>
          All Days
        </span>
      </button>

      {/* Individual day pills */}
      {days.map(day => {
        const isActive = activeDay === day
        return (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className="relative shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            {isActive && (
              <motion.div
                layoutId="day-pill-active"
                className="absolute inset-0 bg-navy rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className={`relative z-10 ${isActive ? 'text-white' : 'text-umber hover:text-navy'}`}>
              Day {day}
            </span>
          </button>
        )
      })}
    </div>
  )
}
