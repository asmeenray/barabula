'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
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

export default function ChatPage() {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

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

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
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

      // If itinerary was returned, the API provides itineraryId.
      // Separately fetch the itinerary to get counts for the preview card.
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="chat-container">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {historyLoading && (
          <div className="flex justify-center py-8">
            <div className="text-sm text-gray-400">Loading conversation...</div>
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-4xl mb-4">✈️</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Plan your next trip</h2>
            <p className="text-gray-500 text-sm max-w-sm">
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
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
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

      {/* Fixed input area at bottom of chat container */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={sending || historyLoading}
      />
    </div>
  )
}
