'use client'

import type { ConversationPhase } from '@/lib/types'

interface BottomTabBarProps {
  conversationPhase: ConversationPhase
  activeTab: 'flights' | 'hotels' | null
  onTabChange: (tab: 'flights' | 'hotels' | null) => void
}

const PHASE_SHOWS_TABS: ConversationPhase[] = ['gathering_details', 'ready_for_summary']

export function BottomTabBar({ conversationPhase, activeTab, onTabChange }: BottomTabBarProps) {
  const showFlightsHotels = PHASE_SHOWS_TABS.includes(conversationPhase)

  function handleTabClick(tab: 'flights' | 'hotels') {
    onTabChange(activeTab === tab ? null : tab)
  }

  return (
    <div className="flex border-t border-sky/30" data-testid="bottom-tab-bar">
      {/* Itinerary tab — always visible, cosmetic */}
      <button
        type="button"
        disabled
        className="flex-1 py-3 text-xs font-medium transition-colors text-umber opacity-60 cursor-not-allowed"
      >
        Itinerary
      </button>

      {showFlightsHotels && (
        <>
          <button
            type="button"
            onClick={() => handleTabClick('flights')}
            className={[
              'flex-1 py-3 text-xs font-medium transition-colors',
              activeTab === 'flights'
                ? 'text-navy border-t-2 border-coral -mt-px'
                : 'text-umber opacity-60 hover:opacity-100 hover:text-navy',
            ].join(' ')}
          >
            Flights
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('hotels')}
            className={[
              'flex-1 py-3 text-xs font-medium transition-colors',
              activeTab === 'hotels'
                ? 'text-navy border-t-2 border-coral -mt-px'
                : 'text-umber opacity-60 hover:opacity-100 hover:text-navy',
            ].join(' ')}
          >
            Hotels
          </button>
        </>
      )}
    </div>
  )
}
