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
        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
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
