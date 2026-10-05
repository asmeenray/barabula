import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startCostLog } from '@/lib/cost-log'
import { fetchCityImage } from '@/lib/unsplash'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) return NextResponse.json({ url: null })

  // No 401 here: the proxy already blocks anonymous callers. The user id is only for the cost row.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cost = startCostLog('/api/destination-image', user?.id ?? null)
  try {
    const url = await fetchCityImage(destination, cost)
    return NextResponse.json({ url: url ?? null })
  } finally {
    await cost.flush()
  }
}
