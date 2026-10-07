// Interest chips on the pass (D-17 discretion, UI-SPEC Copywriting). The
// server accepts only these labels (T-16-27).
export const INTEREST_CHIPS = [
  'Food',
  'Coffee',
  'Views',
  'Museums',
  'Architecture',
  'Markets',
  'Nightlife',
  'Hiking',
  'Beaches',
  'Slow pace',
  'Kid-friendly',
] as const

export type Interest = (typeof INTEREST_CHIPS)[number]
