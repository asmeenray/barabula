import ReactMarkdown, { Components } from 'react-markdown'
import { ItineraryChatCard } from '@/components/chat/ItineraryChatCard'

interface MessageBubbleProps {
  message: {
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
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-1 last:mb-0 text-[13px] leading-[1.55] text-gray-700">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => (
    // Examples in parens — same size/color as surrounding text, not styled differently
    <em className="not-italic text-gray-700">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mt-1.5 mb-0.5 space-y-1 list-none pl-0">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="relative pl-3.5 text-[13px] leading-[1.55] text-gray-700">
      <span className="absolute left-0 top-[0.5em] text-umber/40 text-[10px] leading-none select-none">•</span>
      {children}
    </li>
  ),
  h3: ({ children }) => (
    <h3 className="font-serif text-[14px] text-navy mb-1 mt-2.5 first:mt-0">{children}</h3>
  ),
  ol: ({ children }) => (
    <ol className="mt-1.5 mb-0.5 space-y-1 list-decimal list-inside pl-0.5">{children}</ol>
  ),
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[62%] px-4 py-2.5 bg-navy text-white text-[13.5px] leading-relaxed rounded-2xl rounded-br-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  // AI message — no bubble, full width, editorial flow
  return (
    <div className="flex items-start gap-3 pr-4">
      {/* Minimal branded mark */}
      <div className="shrink-0 mt-[3px]">
        <div className="w-5 h-5 rounded-full bg-coral/10 border border-coral/20 flex items-center justify-center">
          <span className="font-logo text-[8px] text-coral leading-none">B</span>
        </div>
      </div>

      {/* Full-width content — no bubble */}
      <div className="flex-1 min-w-0">
        {message.itineraryData ? (
          <ItineraryChatCard data={message.itineraryData} />
        ) : (
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
