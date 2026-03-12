import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a hotel information assistant. When given a hotel name (and optional destination city), return the verified details for that hotel from your training data.

Return ONLY valid JSON with this exact shape:
{
  "found": true/false,
  "full_name": "Exact official hotel name",
  "area": "Neighbourhood or district (e.g. 'Shinjuku' or 'South Bank')",
  "city": "City name",
  "star_rating": 1-5 integer
}

If you cannot identify the hotel with confidence, return { "found": false }.
Do not guess — return found: false if uncertain.`

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
