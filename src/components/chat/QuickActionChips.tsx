'use client'

const QUICK_ACTIONS = [
  { label: 'Looks good', message: 'Looks good! Generate my full itinerary.' },
  { label: 'Change dates', message: 'I want to change the dates.' },
  { label: 'Add a budget', message: 'Can you factor in a budget for this trip?' },
]

interface QuickActionChipsProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function QuickActionChips({ onSend, disabled }: QuickActionChipsProps) {
  if (disabled) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2" data-testid="quick-action-chips">
      {QUICK_ACTIONS.map(action => (
        <button
          key={action.label}
          type="button"
          onClick={() => onSend(action.message)}
          className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
