'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SplitLayout } from '@/components/chat/SplitLayout'
import { ContextPanel } from '@/components/chat/ContextPanel'
import { QuickActionChips } from '@/components/chat/QuickActionChips'
import { BottomTabBar } from '@/components/chat/BottomTabBar'
import { getPrompt, clearPrompt } from '@/lib/landing/prompt-store'
import type { ChatMessage } from '@/lib/types'

// Local message type — includes optional itinerary data for structured rendering
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

// Inner component that uses useSearchParams (requires Suspense boundary in Next.js App Router)
function ChatPageInner() {
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('q') ?? getPrompt() ?? ''

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState(initialPrompt)
  const [sending, setSending] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [latestItineraryData, setLatestItineraryData] = useState<LocalMessage['itineraryData'] | null>(null)
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Clear stored prompt after reading
  useEffect(() => {
    if (initialPrompt) clearPrompt()
  }, [initialPrompt])

  // Load history on mount
  useEffect(() => {
    fetch('/api/chat/history')
      .then(r => r.json())
      .then((data: ChatMessage[]) => {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })))
      })
      .catch(() => {/* silent — empty history on error */})
      .finally(() => setHistoryLoading(false))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(overrideContent?: string) {
    const content = overrideContent ?? input
    if (!content.trim() || sending) return

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    setMessages(prev => [...prev, userMsg])
    if (!overrideContent) setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content }),
      })
      const data = await res.json()

      const aiMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      }

      // If itinerary was returned, separately fetch the itinerary to get counts for the preview card.
      if (data.itineraryId) {
        try {
          const itinRes = await fetch(`/api/itineraries/${data.itineraryId}`)
          const itin = await itinRes.json()
          aiMsg.itineraryData = {
            title: itin.title,
            destination: itin.destination ?? '',
            start_date: itin.start_date ?? '',
            end_date: itin.end_date ?? '',
            dayCount: [...new Set((itin.activities ?? []).map((a: { day_number: number }) => a.day_number))].length,
            activityCount: (itin.activities ?? []).length,
          }
          setLatestItineraryData(aiMsg.itineraryData)
        } catch {
          // Card data fetch failed — still show the text message
        }

        setMessages(prev => [...prev, aiMsg])
        setSending(false)
        // Navigate to the new itinerary after a 2.5 second pause
        setTimeout(() => router.push(`/itinerary/${data.itineraryId}`), 2500)
      } else {
        setMessages(prev => [...prev, aiMsg])
        setSending(false)
      }
    } catch {
      const errorMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }
      setMessages(prev => [...prev, errorMsg])
      setSending(false)
    }
  }

  const leftPanel = (
    <div className="flex flex-col h-full">
      {/* Minimal chat header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="font-semibold text-gray-900 text-base">Barabula</span>
        <span className="text-xs text-gray-400">AI Trip Planner</span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chat-container">
        {historyLoading && (
          <div className="flex justify-center py-8">
            <div className="text-sm text-gray-400">Loading conversation...</div>
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <h2 className="font-serif text-2xl text-gray-800 mb-2">Where to next?</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Tell me where you want to go, when, and what you enjoy — I&apos;ll build a full itinerary for you.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator — shown while AI is responding */}
        {sending && (
          <div className="flex items-end gap-2 justify-start" data-testid="typing-indicator">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-500">
              AI
            </div>
            <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick action chips — shown when not sending */}
      <QuickActionChips onSend={(msg) => sendMessage(msg)} disabled={sending || historyLoading} />

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-100">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          disabled={sending || historyLoading}
        />
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  )

  const rightPanel = (
    <ContextPanel
      itineraryData={latestItineraryData ?? null}
      isGenerating={sending}
    />
  )

  return <SplitLayout left={leftPanel} right={rightPanel} />
}

// Suspense wrapper required for useSearchParams in Next.js App Router
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
