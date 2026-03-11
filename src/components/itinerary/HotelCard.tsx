'use client'
import { motion } from 'motion/react'
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
    <motion.div
      layout
      onClick={onCardClick}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden
        ${isActive
          ? 'shadow-lg shadow-navy/15 border border-navy/30 ring-1 ring-navy/10'
          : 'border border-sky/50 hover:shadow-md hover:border-sky hover:shadow-navy/8'
        }
      `}
    >
      {/* Glassmorphism navy background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy/8 via-sky/20 to-sky/10 backdrop-blur-sm" />

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Hotel icon with navy bg */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base
            ${isActive ? 'bg-navy' : 'bg-navy/90'}
          `}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 21V8l9-6 9 6v13" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9 21V15h6v6" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9 9h.01M12 9h.01M15 9h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-navy text-sm leading-snug">{hotelName}</p>
              <span className="text-[10px] font-semibold text-navy/50 bg-navy/8 px-2 py-0.5 rounded-full shrink-0 tracking-wide uppercase">
                Stay
              </span>
            </div>

            {/* Star rating */}
            {starRating !== undefined && starRating !== null && (
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: Math.min(starRating, 5) }).map((_, i) => (
                  <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="#D67940">
                    <path d="M5 0.5L6.18 3.55L9.51 3.64L6.97 5.68L7.88 8.81L5 7.05L2.12 8.81L3.03 5.68L0.49 3.64L3.82 3.55L5 0.5Z"/>
                  </svg>
                ))}
                {starRating > 5 && (
                  <span className="text-[10px] text-umber/60">+{starRating - 5}</span>
                )}
              </div>
            )}

            {/* Check-in / Check-out */}
            {(checkIn || checkOut) && (
              <div className="flex items-center gap-3 mt-1.5">
                {checkIn && (
                  <div className="flex items-center gap-1 text-xs text-umber/70">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6F4849" strokeWidth="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="#6F4849" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>In: {checkIn}</span>
                  </div>
                )}
                {checkOut && (
                  <div className="flex items-center gap-1 text-xs text-umber/70">
                    <span>Out: {checkOut}</span>
                  </div>
                )}
              </div>
            )}

            {activity.location && (
              <p className="text-xs text-umber/50 mt-1 flex items-center gap-1">
                <svg width="8" height="10" viewBox="0 0 10 12" fill="none">
                  <path d="M5 0C2.794 0 1 1.794 1 4C1 6.628 5 12 5 12C5 12 9 6.628 9 4C9 1.794 7.206 0 5 0Z" fill="#6F4849" fillOpacity="0.4"/>
                </svg>
                <span className="line-clamp-1">{activity.location}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
