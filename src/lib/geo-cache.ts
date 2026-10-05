// Pure helpers for cached map coordinates in activities.extra_data.
// Only coordinates tagged geo_source 'osm_nominatim' count as cached;
// anything else is treated as uncached and replaced by an OSM result.

export const OSM_GEO_SOURCE = 'osm_nominatim'

type ExtraData = Record<string, unknown> | null | undefined

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function osmCoordsFrom(extra: ExtraData): { lat: number; lng: number } | null {
  if (!extra || extra.geo_source !== OSM_GEO_SOURCE) return null
  const { lat, lng } = extra
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null
  return { lat, lng }
}

export function needsGeocoding(extra: ExtraData): boolean {
  if (osmCoordsFrom(extra)) return false
  return extra?.geo_status !== 'not_found'
}
