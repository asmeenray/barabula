'use client'

import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'

const CHIPS = [
  { label: 'Going solo', prompt: 'Solo trip — somewhere off the beaten path, 7 days' },
  { label: 'Family trip', prompt: 'Family trip with kids, activities for all ages, 10 days' },
  { label: 'Romantic escape', prompt: 'Romantic getaway for 2, luxury, 5 days' },
  { label: 'Group adventure', prompt: 'Group adventure trip for 6 friends, outdoors and thrills, 10 days' },
  { label: 'Weekend getaway', prompt: 'Weekend getaway, 2-3 days, close to home' },
]

interface QuickChipsProps {
  onSelect?: (prompt: string) => void
}

export function QuickChips({ onSelect }: QuickChipsProps) {
  const [active, setActive] = useState<string | null>(null)

  function handleClick(chip: (typeof CHIPS)[number]) {
    setActive(chip.label)
    onSelect?.(chip.prompt)
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {CHIPS.map(chip => (
        <Chip
          key={chip.label}
          label={chip.label}
          onClick={() => handleClick(chip)}
          active={active === chip.label}
        />
      ))}
    </div>
  )
}
