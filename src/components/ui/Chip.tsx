'use client'

interface ChipProps {
  label: string
  onClick: () => void
  active?: boolean
}

export function Chip({ label, onClick, active = false }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-white/50',
        active
          ? 'bg-white text-gray-900 border-white'
          : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:border-white/40',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
