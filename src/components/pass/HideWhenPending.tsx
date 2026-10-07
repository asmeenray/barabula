'use client'

// Hides a home pass while its trip's delete waits out the Undo window, or once
// it has been deleted on this visit (16-17, D-27). The home stays a Server
// Component; this wrapper adds no DOM, so grids and lists keep their layout.

import { useUndo } from '@/components/undo/UndoProvider'
import { useTripDeletes } from '@/lib/plan/delete-trip'

export function HideWhenPending({ id, children }: { id: string; children: React.ReactNode }) {
  const { pendingIds } = useUndo()
  const { hidden } = useTripDeletes()
  if (pendingIds.has(id) || hidden.has(id)) return null
  return <>{children}</>
}

/** The trips a home list should show: those not waiting out a delete (counts follow). */
export function useVisibleTrips<T extends { id: string }>(trips: T[]): T[] {
  const { pendingIds } = useUndo()
  const { hidden } = useTripDeletes()
  if (pendingIds.size === 0 && hidden.size === 0) return trips
  return trips.filter((t) => !pendingIds.has(t.id) && !hidden.has(t.id))
}
