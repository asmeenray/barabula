/**
 * Fetches place data (rating, price level) from the Foursquare Places API v3.
 * rating: 0.0–10.0 on native Foursquare scale (divide by 2 for star equivalence)
 * priceLevel: 1–4 integer ($/$$/$$$/$$$$ equivalence)
 * Returns all nulls on any failure — never throws.
 */
export async function fetchPlacesData(
  activityName: string,
  destination: string
): Promise<{ rating: number | null; priceLevel: number | null }> {
  const key = process.env.FOURSQUARE_API_KEY
  if (!key) return { rating: null, priceLevel: null }

  try {
    const params = new URLSearchParams({
      query: activityName,
      near: destination,
      limit: '1',
      fields: 'rating,price',
    })
    const url = `https://api.foursquare.com/v3/places/search?${params.toString()}`
    const res = await fetch(url, {
      headers: { Authorization: key },
    })
    if (!res.ok) return { rating: null, priceLevel: null }

    const data = await res.json() as { results: Array<{ rating?: number; price?: number }> }
    const first = data.results?.[0]
    if (!first) return { rating: null, priceLevel: null }

    return {
      rating: first.rating ?? null,
      priceLevel: first.price ?? null,
    }
  } catch {
    return { rating: null, priceLevel: null }
  }
}
