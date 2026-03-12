'use client'

import type { ConversationPhase, ChipConfig } from '@/lib/types'

const DEFAULT_CHIPS: ChipConfig[] = [
  { label: 'Looks good', message: 'Looks good! Generate my full itinerary.' },
  { label: 'Change dates', message: 'I want to change the dates.' },
  { label: 'Add a budget', message: 'Can you factor in a budget for this trip?' },
]

const SUMMARY_CHIPS: ChipConfig[] = [
  { label: 'Looks good', message: 'Looks good! Generate my full itinerary.' },
  { label: 'Change dates', message: 'I want to change the dates.' },
  { label: 'Add budget', message: 'Can you factor in a budget for this trip?' },
  { label: 'More relaxed', message: 'Make it more relaxed — fewer activities.' },
  { label: 'Add hidden gems', message: 'Add some hidden gems and local spots.' },
]

const CHIP_SETS: Record<ConversationPhase, ChipConfig[]> = {
  gathering_destination: [],
  gathering_details: [
    { label: 'Getting around', message: '__show_transport_panel__' },
  ],
  ready_for_summary: SUMMARY_CHIPS,
  generating_itinerary: [],
  itinerary_complete: [
    { label: 'Plan a new trip', message: '__reset_session__' },
  ],
}

interface QuickActionChipsProps {
  onSend: (message: string) => void
  disabled?: boolean
  conversationPhase?: ConversationPhase
}

export function QuickActionChips({ onSend, disabled, conversationPhase }: QuickActionChipsProps) {
  if (disabled) return null

  const chips = conversationPhase !== undefined ? CHIP_SETS[conversationPhase] : DEFAULT_CHIPS
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2" data-testid="quick-action-chips">
      {chips.map(chip => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onSend(chip.message)}
          className="px-4 py-1.5 rounded-full text-sm font-medium border border-sky-dark/50 text-navy/80 bg-sand hover:bg-sky/40 hover:border-sky-dark transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-coral/20"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
