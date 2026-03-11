'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SplitLayout } from '@/components/chat/SplitLayout'
import { ContextPanel } from '@/components/chat/ContextPanel'
import { QuickActionChips } from '@/components/chat/QuickActionChips'
import { BottomTabBar } from '@/components/chat/BottomTabBar'
import Link from 'next/link'
import { getPrompt, clearPrompt } from '@/lib/landing/prompt-store'
import type { ChatMessage, ConversationPhase, TripState } from '@/lib/types'

type LocalMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  itineraryData?: {
    title: string
    destination: string
    start_date: string
    end_date: string
    dayCount: number
    activityCount: number
  }
}

type FullItineraryData = {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  activities: Array<{
    id: string
    day_number: number
    name: string
    time: string | null
    description: string | null
    location: string | null
  }>
}

// Stable ID for the initial prompt message so history merge can identify it
const INITIAL_MSG_ID = '__initial_prompt__'

function ChatPageInner() {
  const searchParams = useSearchParams()
  const initialPrompt = useRef(searchParams.get('q') ?? getPrompt() ?? '').current

  // Pre-populate user message immediately — never lost, even if history replaces state later
  const [messages, setMessages] = useState<LocalMessage[]>(() =>
    initialPrompt
      ? [{ id: INITIAL_MSG_ID, role: 'user' as const, content: initialPrompt }]
      : []
  )
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [latestItineraryData, setLatestItineraryData] = useState<LocalMessage['itineraryData'] | null>(null)
  const [itineraryId, setItineraryId] = useState<string | null>(null)
  const [fullItinerary, setFullItinerary] = useState<FullItineraryData | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('gathering_destination')
  const [tripState, setTripState] = useState<Partial<TripState>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)

  // Fetch user for personalized greeting
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const full = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
        setUserName(full ? full.split(' ')[0] : null)
      }
    })
  }, [])

  // Clear stored prompt after reading
  useEffect(() => {
    if (initialPrompt) clearPrompt()
  }, [initialPrompt])

  // Load history and session state — auto-reset first when starting a new trip
  useEffect(() => {
    async function initSession() {
      if (initialPrompt) {
        // New trip intent — wipe previous session + history for a clean slate
        await fetch('/api/chat/session', { method: 'DELETE' })
      }

      // Load history (will be empty after reset)
      fetch('/api/chat/history')
        .then(r => r.json())
        .then((data: ChatMessage[]) => {
          const history = data.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }))
          setMessages(prev => {
            // Keep everything after history (the initial prompt + any responses already added)
            const nonHistory = prev.filter(m => m.id === INITIAL_MSG_ID)
            return [...history, ...nonHistory]
          })
        })
        .catch(() => {/* silent — empty history on error */})

      // Load trip session state (will be empty after reset)
      fetch('/api/chat/session')
        .then(r => r.ok ? r.json() : null)
        .then(session => {
          if (session?.conversation_phase) setConversationPhase(session.conversation_phase)
          if (session?.trip_state) setTripState(session.trip_state)
        })
        .catch(() => {/* silent */})
    }

    initSession().finally(() => setHistoryLoading(false))
  }, [])

  // Auto-send: only triggers API — user message already in state from initial useState
  useEffect(() => {
    if (initialPrompt && !historyLoading && !autoSentRef.current) {
      autoSentRef.current = true
      callApi(initialPrompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Raw API call — does NOT add a user message (caller is responsible for that)
  async function callApi(content: string) {
    setSending(true)
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()

      if (data.conversationPhase) setConversationPhase(data.conversationPhase)
      if (data.tripState) setTripState(data.tripState)

      const aiMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      }

      if (data.itineraryId) {
        setItineraryId(data.itineraryId)
        try {
          const itinRes = await fetch(`/api/itineraries/${data.itineraryId}`)
          const itin = await itinRes.json()
          setFullItinerary(itin)  // store full data for right panel
          // Also set latestItineraryData for any remaining usage
          setLatestItineraryData({
            title: itin.title,
            destination: itin.destination ?? '',
            start_date: itin.start_date ?? '',
            end_date: itin.end_date ?? '',
            dayCount: [...new Set((itin.activities ?? []).map((a: { day_number: number }) => a.day_number))].length,
            activityCount: (itin.activities ?? []).length,
          })
        } catch {
          // silent — text message still shows
        }
        setMessages(prev => [...prev, aiMsg])
        setSending(false)
        // Auto-navigation removed — user accepts via "Accept & View Full Itinerary" button in right panel
      } else {
        setMessages(prev => [...prev, aiMsg])
        setSending(false)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
      setSending(false)
    }
  }

  // User-initiated send — adds user message then calls API
  function sendMessage(overrideContent?: string) {
    const content = overrideContent ?? input
    if (!content.trim() || sending) return

    // Sentinel: "Plan a new trip" chip — confirm, reset session, and reload
    if (content === '__reset_session__') {
      const destination = tripState.destination ? `your current ${tripState.destination} planning` : 'your current planning'
      const confirmed = window.confirm(`This will clear ${destination} — continue?`)
      if (!confirmed) return
      fetch('/api/chat/session', { method: 'DELETE' })
        .finally(() => window.location.reload())
      return
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }])
    if (!overrideContent) setInput('')
    callApi(content)
  }

  const greeting = userName ? `Hey ${userName}, where are we going today?` : 'Where are we going today?'
  const subtext = userName
    ? `I'm your AI travel planner. Tell me your dream trip and I'll design it for you.`
    : `Tell me where you want to go, when, and what you enjoy — I'll build a full itinerary for you.`

  const leftPanel = (
    <div className="flex flex-col h-full bg-sand/40">
      {/* Chat header */}
      <div className="px-5 py-4 border-b border-sand-dark/40 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm">
        <Link href="/" className="font-logo text-navy text-xl tracking-tight hover:text-navy/70 transition-colors">Barabula.</Link>
        <span className="text-xs text-umber/60">AI Trip Planner</span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chat-container">
        {historyLoading && (
          <div className="flex justify-center py-8">
            <div className="text-sm text-umber/40">Loading conversation...</div>
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <h2 className="font-serif text-2xl text-navy mb-2">{greeting}</h2>
            <p className="text-umber/60 text-sm max-w-xs leading-relaxed">{subtext}</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator — matches editorial AI message style */}
        {sending && (
          <div className="flex items-start gap-3 pr-4" data-testid="typing-indicator">
            <div className="shrink-0 mt-[3px] w-5 h-5 rounded-full bg-coral/10 border border-coral/20 flex items-center justify-center">
              <span className="font-logo text-[8px] text-coral leading-none">B</span>
            </div>
            <div className="flex gap-1.5 items-center pt-1.5">
              <span className="w-1.5 h-1.5 bg-umber/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-umber/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-umber/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick action chips */}
      <QuickActionChips
        onSend={(msg) => sendMessage(msg)}
        disabled={sending || historyLoading}
        conversationPhase={conversationPhase}
      />

      {/* Input area */}
      <div className="shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          disabled={sending || historyLoading}
        />
      </div>

      <BottomTabBar />
    </div>
  )

  return <SplitLayout left={leftPanel} right={<ContextPanel itineraryData={latestItineraryData ?? null} isGenerating={sending} conversationPhase={conversationPhase} tripState={tripState} fullItinerary={fullItinerary} itineraryId={itineraryId} />} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-umber/40 bg-sand/40">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
