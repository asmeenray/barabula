'use client'

interface TransportChipPanelProps {
  currentMode: string | null
  onSelect: (mode: string) => void
  onClose: () => void
}

const TRANSPORT_OPTIONS = [
  { label: 'Public transport', value: 'public_transport' },
  { label: 'Rent a car', value: 'rent_a_car' },
  { label: 'Mix of both', value: 'mix' },
  { label: "I'll figure it out", value: 'figure_it_out' },
] as const

export function TransportChipPanel({ currentMode, onSelect, onClose }: TransportChipPanelProps) {
  return (
    <div className="border border-sky/30 rounded-2xl bg-white/95 shadow-lg mx-3 mb-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">How are you getting around?</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-umber/40 hover:text-umber/70 transition-colors text-lg leading-none"
          aria-label="Close transport panel"
        >
          ✕
        </button>
      </div>

      {/* 2x2 grid of transport mode options */}
      <div className="grid grid-cols-2 gap-2">
        {TRANSPORT_OPTIONS.map(option => {
          const isSelected = option.value === currentMode
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={[
                'px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 text-left',
                isSelected
                  ? 'bg-navy text-white border-navy'
                  : 'text-umber border-sky/40 hover:border-sky/60 bg-white',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
