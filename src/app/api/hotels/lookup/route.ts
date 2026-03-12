import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a helpful hotel information assistant for a travel planning app. Given a hotel name (possibly with spelling mistakes or incomplete) and optionally a destination city, find the best matching real hotel and return its details.

Return ONLY valid JSON with this exact shape:
{
  "found": true/false,
  "full_name": "Correct official hotel name",
  "area": "Neighbourhood or district (e.g. 'Shinjuku', 'South Bank', 'Downtown'), or empty string if unknown",
  "city": "City name",
  "star_rating": 1-5 integer
}

Important rules:
- Always try to find a match. Correct spelling mistakes, interpret partial names, and use the destination city as context.
- Examples: "Park Hiatt Tokyo" → "Park Hyatt Tokyo" (Shinjuku, Tokyo, 5-star). "Marriot" in Dubai → "Marriott Hotel Dubai" (4-star).
- For hotel chains without a specific property name (e.g. just "Hilton" in Paris), return the flagship/most well-known property in that city.
- Estimate star_rating from brand if needed: Ritz-Carlton/Four Seasons/Aman = 5, Marriott/Hilton/Hyatt = 4, Holiday Inn/Novotel = 3, Premier Inn/Ibis = 3.
- Set found: false ONLY if the input is completely unrecognisable as a hotel name (random characters, clearly fictional).
- Use the destination city to disambiguate when multiple properties exist.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hotel_name, destination } = body as { hotel_name: string; destination?: string }

    if (!hotel_name || typeof hotel_name !== 'string') {
      return NextResponse.json({ found: false })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const userMessage = `Find hotel: ${hotel_name}${destination ? ` in ${destination}` : ''}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content ?? ''

    let parsed: {
      found: boolean
      full_name?: string
      area?: string
      city?: string
      star_rating?: number
    }

    try {
      parsed = JSON.parse(rawContent)
    } catch {
      return NextResponse.json({ found: false })
    }

    if (!parsed.found) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      full_name: parsed.full_name ?? hotel_name,
      area: parsed.area ?? '',
      city: parsed.city ?? destination ?? '',
      star_rating: parsed.star_rating ?? 4,
    })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
