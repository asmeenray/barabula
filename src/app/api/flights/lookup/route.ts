import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-initialize after auth so key is not required for unauthenticated calls
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const body = await req.json()
  const {
    airline,
    flight_number,
    from_airport,
    to_airport,
    approx_departure,
  } = body as {
    airline?: string
    flight_number?: string
    from_airport?: string
    to_airport?: string
    approx_departure?: string
  }

  const userMessage = `Find flight: ${airline ?? ''} ${flight_number ?? ''} from ${from_airport ?? 'unknown'} to ${to_airport ?? 'unknown'}${approx_departure ? `, approximate departure ${approx_departure}` : ''}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a flight schedule lookup assistant. When given airline and flight number (or airline + route + approximate time), return the most likely real-world schedule for that flight based on your training data.

Return ONLY valid JSON with this exact shape:
{
  "found": true/false,
  "from_airport": "IATA code or city name",
  "to_airport": "IATA code or city name",
  "departure_time": "HH:MM (24h) or 'H:MM AM/PM'",
  "arrival_time": "HH:MM (24h) or 'H:MM AM/PM'",
  "note": "optional short note if schedule varies by day or season"
}

If you cannot identify the flight with confidence, return { "found": false }.
Do not hallucinate specific times if you are not confident — return found: false instead.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ found: false })
    }

    if (!parsed.found) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      from_airport: parsed.from_airport ?? null,
      to_airport: parsed.to_airport ?? null,
      departure_time: parsed.departure_time ?? null,
      arrival_time: parsed.arrival_time ?? null,
      note: parsed.note ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
