// "Open in Google Maps" link (UI-SPEC §7 item 7). A plain Maps URL, no API
// and no key. Form checked against Google's Maps URLs docs (search action):
// https://www.google.com/maps/search/?api=1&query={text or "lat,lng"}.

const SEARCH = 'https://www.google.com/maps/search/?api=1&query='

export interface MapsLinkPlace {
  name: string
  location?: string | null
  lat?: number | null
  lng?: number | null
}

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/** "name, location" when a location is set; else "lat,lng"; else the name. */
export function googleMapsUrl({ name, location, lat, lng }: MapsLinkPlace): string {
  const area = location?.trim()
  const query = area
    ? `${name.trim()}, ${area}`
    : finite(lat) && finite(lng)
      ? `${lat},${lng}`
      : name.trim()
  return SEARCH + encodeURIComponent(query)
}
