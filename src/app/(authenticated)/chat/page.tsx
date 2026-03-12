'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SplitLayout } from '@/components/chat/SplitLayout'
import { ContextPanel } from '@/components/chat/ContextPanel'
import { QuickActionChips } from '@/components/chat/QuickActionChips'
import { BottomTabBar } from '@/components/chat/BottomTabBar'
import { FlightsTabPanel } from '@/components/chat/FlightsTabPanel'
import { HotelsTabPanel } from '@/components/chat/HotelsTabPanel'
import Link from 'next/link'
import { getPrompt, clearPrompt } from '@/lib/landing/prompt-store'
import type { ChatMessage, ConversationPhase, TripState } from '@/lib/types'
import type { FlightInputData } from '@/components/chat/FlightsTabPanel'
import type { HotelSaveData } from '@/components/chat/HotelsTabPanel'

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
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | null>(null)
  const [flightInputData, setFlightInputData] = useState<FlightInputData | null>(null)
  const [hotelSaveData, setHotelSaveData] = useState<HotelSaveData | null>(null)
  const hotelPreference = hotelSaveData?.mode === 'preference' ? hotelSaveData.preference : null
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const router = useRouter()
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
        body: JSON.stringify({ content, flightInputData, hotelSaveData }),
      })
      const data = await res.json()

      if (data.conversationPhase) {
        setConversationPhase(data.conversationPhase)
        if (data.conversationPhase === 'itinerary_complete') setActiveTab(null)
      }
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

        // Mobile: show overlay then auto-navigate. Desktop: ContextPanel Accept button drives nav.
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setShowMobileOverlay(true)
          setTimeout(() => {
            router.push(`/itinerary/${data.itineraryId}`)
          }, 1200)
        }
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

      {/* Tab panels — expand above input when a tab is active */}
      <AnimatePresence>
        {activeTab === 'flights' && (
          <motion.div
            key="flights-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="shrink-0"
          >
            <FlightsTabPanel
              tripState={tripState}
              initialData={flightInputData}
              onSave={(data) => setFlightInputData(data)}
              onClose={() => setActiveTab(null)}
            />
          </motion.div>
        )}
        {activeTab === 'hotels' && (
          <motion.div
            key="hotels-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="shrink-0"
          >
            <HotelsTabPanel
              tripState={tripState}
              hotelPreference={hotelPreference}
              onSave={(data) => setHotelSaveData(data)}
              onClose={() => setActiveTab(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          disabled={sending || historyLoading}
        />
      </div>

      <BottomTabBar
        conversationPhase={conversationPhase}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )

  return (
    <>
      <SplitLayout left={leftPanel} right={<ContextPanel itineraryData={latestItineraryData ?? null} isGenerating={sending} conversationPhase={conversationPhase} tripState={tripState} fullItinerary={fullItinerary} itineraryId={itineraryId} />} />

      {/* Mobile itinerary-building overlay — shown briefly before auto-navigation */}
      <AnimatePresence>
        {showMobileOverlay && (
          <motion.div
            key="mobile-nav-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sand"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="flex flex-col items-center gap-4"
            >
              {/* Coral spinner */}
              <div className="w-10 h-10 rounded-full border-2 border-coral/20 border-t-coral animate-spin" />
              <div className="text-center">
                <p className="font-serif text-xl text-navy mb-1">Building your itinerary...</p>
                <p className="text-sm text-umber/60">Crafting every detail</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-umber/40 bg-sand/40">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
