'use client'
import type { Activity } from '@/lib/types'

interface HotelCardProps {
  activity: Activity
  isActive?: boolean
  onCardClick?: () => void
}

type HotelData = {
  hotel_name?: string
  star_rating?: number
  check_in?: string
  check_out?: string
} | null

export function HotelCard({ activity, isActive = false, onCardClick }: HotelCardProps) {
  const hotelData = activity.extra_data as HotelData

  const hotelName = hotelData?.hotel_name ?? activity.name
  const starRating = hotelData?.star_rating
  const checkIn = hotelData?.check_in
  const checkOut = hotelData?.check_out

  return (
    <div
      onClick={onCardClick}
      className={`rounded-2xl p-4 border cursor-pointer transition-all ${
        isActive
          ? 'border-coral ring-1 ring-coral/20 shadow-md bg-sky/10'
          : 'border-sky/60 bg-sky/10 hover:border-coral/40'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Hotel icon */}
        <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center shrink-0 text-lg">
          🏨
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-navy text-sm">{hotelName}</p>

          {starRating !== undefined && starRating !== null && (
            <p className="text-coral text-xs mt-0.5">
              {'★'.repeat(Math.min(starRating, 10))}
              <span className="text-umber ml-1">({starRating} stars)</span>
            </p>
          )}

          {(checkIn || checkOut) && (
            <p className="text-xs text-umber mt-1">
              {checkIn && checkOut
                ? `Check-in: ${checkIn} · Check-out: ${checkOut}`
                : checkIn
                ? `Check-in: ${checkIn}`
                : `Check-out: ${checkOut}`}
            </p>
          )}

          {activity.location && (
            <p className="text-xs text-umber/70 mt-1 flex items-center gap-1">
              <span>📍</span>
              <span>{activity.location}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
