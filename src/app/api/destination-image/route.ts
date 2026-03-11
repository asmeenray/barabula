import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) return NextResponse.json({ url: null })

  const pexelsKey = process.env.PEXELS_API_KEY
  if (!pexelsKey) return NextResponse.json({ url: null })

  try {
    const query = encodeURIComponent(`${destination} travel landmark`)
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: pexelsKey } }
    )
    if (!res.ok) return NextResponse.json({ url: null })
    const data = await res.json()
    const photo = data.photos?.[0]
    if (photo) {
      return NextResponse.json({
        url: photo.src.large2x,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
      })
    }
  } catch { /* fall through */ }

  return NextResponse.json({ url: null })
}
