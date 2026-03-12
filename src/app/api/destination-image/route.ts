import { NextRequest, NextResponse } from 'next/server'
import { fetchCityImage } from '@/lib/unsplash'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) return NextResponse.json({ url: null })
  const url = await fetchCityImage(destination)
  return NextResponse.json({ url: url ?? null })
}
