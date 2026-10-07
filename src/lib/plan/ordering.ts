// Fractional ordering inside a day bucket (Research Pattern 5, D-21).
// A move sends one PATCH { day_number, position } with the position halfway
// between the new neighbours. Positions carry order only, no other meaning.

/** Position between two neighbours; null means "no neighbour on that side". */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return 1
  if (prev == null) return (next as number) - 1
  if (next == null) return prev + 1
  return (prev + next) / 2
}

/** True when the gap is too small to split again (renumber the bucket first). */
export function needsRenumber(prev: number, next: number): boolean {
  return Math.abs(next - prev) < 1e-6
}

/** Positions 1, 2, 3, … for the ids in the given order. */
export function renumberDay(ids: readonly string[]): { id: string; position: number }[] {
  return ids.map((id, i) => ({ id, position: i + 1 }))
}
