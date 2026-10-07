// City-name normaliser shared by the server photo match (match.ts) and the
// client pass (matching typed stops against the curated list). No manifest
// import here, so client components can use it without bundling the manifest.

/** Lowercase, strip accents, cut at the first comma, trim and collapse spaces. */
export function normalizeCity(value: string): string {
  return value
    .split(',')[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** The entry whose names include this city, or null. Works on any list shaped like the manifest. */
export function findCity<T extends { names: readonly string[] }>(list: readonly T[], city: string | null | undefined): T | null {
  if (!city) return null
  const key = normalizeCity(city)
  if (!key) return null
  return list.find((p) => p.names.includes(key)) ?? null
}
