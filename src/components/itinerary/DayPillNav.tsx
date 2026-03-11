interface DayPillNavProps {
  days: number[]
  activeDay: number | null
  onDayChange: (day: number) => void
}

export function DayPillNav({ days, activeDay, onDayChange }: DayPillNavProps) {
  const isAllActive = activeDay === null || activeDay === 0

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
      {/* All Days pill */}
      <button
        onClick={() => onDayChange(0)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isAllActive
            ? 'bg-navy text-white'
            : 'bg-sand text-umber border border-sky hover:border-coral'
        }`}
      >
        All Days
      </button>

      {/* Individual day pills */}
      {days.map(day => {
        const isActive = activeDay === day
        return (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-navy text-white'
                : 'bg-sand text-umber border border-sky hover:border-coral'
            }`}
          >
            Day {day}
          </button>
        )
      })}
    </div>
  )
}
