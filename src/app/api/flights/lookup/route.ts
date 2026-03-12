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

  const parts: string[] = []
  if (airline) parts.push(`Airline: ${airline}`)
  if (flight_number) parts.push(`Flight number: ${flight_number}`)
  if (from_airport) parts.push(`Departing from: ${from_airport}`)
  if (to_airport) parts.push(`Going to: ${to_airport}`)
  if (approx_departure) parts.push(`Approximate departure time: ${approx_departure}`)
  const userMessage = parts.length > 0 ? parts.join('\n') : 'No details provided'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a helpful flight information assistant for a travel planning app. The user wants to pre-fill their flight details. Given whatever partial information is available (airline name, flight number, city names, or route), do your best to identify useful airport information and fill in what you can.

Return ONLY valid JSON with this exact shape:
{
  "found": true,
  "from_airport": "IATA code for departure airport (e.g. LHR, JFK, DXB)",
  "to_airport": "IATA code for destination airport, or null if not provided",
  "departure_time": "HH:MM 24h format if known, otherwise null",
  "arrival_time": "HH:MM 24h format if known, otherwise null",
  "note": "helpful note about the route, e.g. which terminal, typical flight duration, or if multiple airports serve this city"
}

Important rules:
- Always set found: true and return your best answer. Even if you only have the departure city, return its main IATA airport code in from_airport.
- City name to IATA: London → LHR (or LGW/STN), New York → JFK (or EWR/LGA), Paris → CDG (or ORY), Tokyo → NRT (or HND), Dubai → DXB, Singapore → SIN, Sydney → SYD, Los Angeles → LAX, etc.
- If the user gives a city name instead of IATA code, convert it to the main IATA code for that city.
- If you know the airline flies this route, add that info to the note.
- departure_time and arrival_time should only be set if you are reasonably confident. Null is fine.
- Only set found: false if the input is completely nonsensical (random characters with no recognisable airline, city, or airport).`,
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
