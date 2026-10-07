import { describe, expect, it } from 'vitest'
import { coverTransitionName, markTripOpen, openedFromPass, TRIP_OPEN } from '@/lib/client/trip-open'

// Moment 4 (16-22, D-30): the pass and plan header share trip-cover-{uuid};
// names never carry user text (T-16-60).

const ID = '4e775662-32a9-4947-b5ad-0c76022067d4'

describe('coverTransitionName', () => {
  it('is trip-cover- plus the trip uuid', () => {
    expect(coverTransitionName(ID)).toBe(`trip-cover-${ID}`)
    expect(coverTransitionName(ID.toUpperCase())).toBe(`trip-cover-${ID}`)
  })

  it('refuses anything that is not a uuid', () => {
    expect(coverTransitionName('Lisbon; } body { display: none')).toBeUndefined()
    expect(coverTransitionName('')).toBeUndefined()
  })
})

describe('openedFromPass', () => {
  it('is true only for the trip whose pass was tapped last', () => {
    expect(openedFromPass(ID)).toBe(false)
    markTripOpen(ID)
    expect(openedFromPass(ID)).toBe(true)
    expect(openedFromPass('11111111-1111-4111-8111-111111111111')).toBe(false)
    expect(TRIP_OPEN).toBe('trip-open')
  })
})
