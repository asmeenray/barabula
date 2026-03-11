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

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-sky border border-sky-dark flex items-center justify-center shrink-0 text-xs font-semibold text-navy">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-navy text-white rounded-2xl rounded-br-sm'
            : 'bg-white/80 text-gray-900 border border-sky/50 rounded-2xl rounded-bl-sm'
        }`}
      >
        {message.itineraryData ? (
          <ItineraryChatCard data={message.itineraryData} />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  )
}
