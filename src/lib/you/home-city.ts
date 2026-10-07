// Pure helpers for the You tab. Plain module (no 'use client'), so the server
// page and the client field share them.

import { foldName, KNOWN_CITIES } from '@/lib/pass/cities'

export const HOME_CITY_MAX = 80
const SUGGESTION_LIMIT = 6

/** Trimmed, single-spaced, at most 80 characters; '' means "no home city" (T-16-54). */
export function cleanHomeCity(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, HOME_CITY_MAX).trim()
}

/** Curated names that match what was typed (accent-free, aliases count), prefix matches first. */
export function homeCitySuggestions(query: string): string[] {
  const key = foldName(query)
  if (!key) return []
  const starts: string[] = []
  const contains: string[] = []
  for (const c of KNOWN_CITIES) {
    if (c.names.some((n) => n.startsWith(key))) starts.push(c.name)
    else if (c.names.some((n) => n.includes(key))) contains.push(c.name)
  }
  // The exact name already typed needs no suggestion.
  return [...starts, ...contains].filter((n) => n !== query.trim()).slice(0, SUGGESTION_LIMIT)
}

/** Up to two initials from the name's first two words ("e2e-owner" → "EO"). */
export function initialsOf(name: string): string {
  const words = name.split(/[\s._-]+/).filter((w) => /\p{L}/u.test(w))
  const letters = words.slice(0, 2).map((w) => w.match(/\p{L}/u)?.[0] ?? '')
  return letters.join('').toUpperCase() || '?'
}
