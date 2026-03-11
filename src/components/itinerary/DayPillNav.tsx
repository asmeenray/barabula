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
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      {/* All Days pill */}
      <button
        onClick={() => onDayChange(0)}
        className="relative shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors border border-sky/50"
        style={isAllActive ? { borderColor: 'transparent' } : {}}
      >
        {isAllActive && (
          <motion.div
            layoutId="day-pill-active"
            className="absolute inset-0 rounded-full"
            style={{ background: '#D67940' }}
            transition={{ type: 'spring', stiffness: 450, damping: 38 }}
          />
        )}
        <span className={`relative z-10 ${isAllActive ? 'text-white' : 'text-umber hover:text-navy'}`}>
          All
        </span>
      </button>

      {/* Individual day pills */}
      {days.map(day => {
        const isActive = activeDay === day
        return (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className="relative shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors border border-sky/50"
            style={isActive ? { borderColor: 'transparent' } : {}}
          >
            {isActive && (
              <motion.div
                layoutId="day-pill-active"
                className="absolute inset-0 rounded-full"
                style={{ background: '#D67940' }}
                transition={{ type: 'spring', stiffness: 450, damping: 38 }}
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
