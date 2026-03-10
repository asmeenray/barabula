import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import type { GeneratedItinerary } from '@/lib/types'

const SYSTEM_PROMPT = `You are Barabula, an AI travel planning assistant. Help users plan trips through conversation.

When the user has provided enough detail to generate a complete itinerary (destination, approximate dates, preferences), generate one. When generating an itinerary, respond ONLY with valid JSON matching this exact schema (no markdown, no prose outside the JSON):
{"type":"itinerary","data":{"title":"...","destination":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","description":"...","days":[{"day_number":1,"activities":[{"name":"...","time":"HH:MM","description":"...","location":"..."}]}]}}

For all other messages, respond with plain conversational text.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-initialize after auth so key is not required for unauthenticated calls
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Message content is required' }, { status: 400 })

  // Fetch last 20 messages for conversation context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ],
  })

  const aiContent = completion.choices[0].message.content ?? ''

  // Persist both messages to chat_history
  await supabase.from('chat_history').insert([
    { user_id: user.id, role: 'user', content },
    { user_id: user.id, role: 'assistant', content: aiContent },
  ])

  // Detect itinerary JSON in response
  try {
    const parsed = JSON.parse(aiContent)
    if (parsed.type === 'itinerary' && parsed.data) {
      const itineraryData = parsed.data as GeneratedItinerary
      const { days, ...itineraryFields } = itineraryData

      const { data: newItinerary, error: insertError } = await supabase
        .from('itineraries')
        .insert({ user_id: user.id, ...itineraryFields })
        .select()
        .single()
      if (insertError) throw insertError

      // Insert activities from all days (flatten)
      const activities = days.flatMap(day =>
        day.activities.map(act => ({
          itinerary_id: newItinerary.id,
          day_number: day.day_number,
          name: act.name,
          time: act.time,
          description: act.description,
          location: act.location,
        }))
      )
      if (activities.length > 0) {
        await supabase.from('activities').insert(activities)
      }

      return Response.json({
        content: "Your itinerary is ready! Taking you there now...",
        itineraryId: newItinerary.id,
      })
    }
  } catch {
    // Not a valid itinerary JSON — treat as regular chat response
  }

  return Response.json({ content: aiContent })
}
