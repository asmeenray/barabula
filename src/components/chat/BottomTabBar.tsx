'use client'

const TABS = [
  { label: 'Itinerary', active: true, disabled: false },
  { label: 'Flights', active: false, disabled: true },
  { label: 'Hotels', active: false, disabled: true },
]

export function BottomTabBar() {
  return (
    <div className="flex border-t border-gray-100" data-testid="bottom-tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.label}
          type="button"
          disabled={tab.disabled}
          className={[
            'flex-1 py-3 text-xs font-medium transition-colors',
            tab.active
              ? 'text-gray-900 border-t-2 border-gray-900 -mt-px'
              : 'text-gray-400',
            tab.disabled ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
