'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import type { Activity } from '@/lib/types'

const PRICE_SYMBOLS: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

interface DaySectionProps {
  dayNumber: number
  activities: Activity[]
  activeActivityId: string | null
  onActivityClick: (id: string) => void
  onAddActivity: (dayNumber: number) => void
  onEditActivity: (activity: Activity) => void
  onDeleteActivity: (id: string) => Promise<void>
  sequenceOffset?: number
  isShareMode?: boolean
}

function TimeChip({ time }: { time?: string | null }) {
  if (!time) return null
  return (
    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
          style={{ background: 'rgba(214,121,64,0.12)', color: '#D67940' }}>
      {time}
    </span>
  )
}

function HotelIcon() {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
         style={{ background: '#285185' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M3 21V8l9-6 9 6v13" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 21V15h6v6" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function ActivityIcon({ isActive }: { isActive: boolean }) {
  return (
    <div
      className="w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-all duration-200"
      style={{
        background: isActive ? '#D67940' : 'white',
        borderColor: isActive ? '#D67940' : '#CCD9E2',
        transform: isActive ? 'scale(1.3)' : 'scale(1)',
        boxShadow: isActive ? '0 0 0 3px rgba(214,121,64,0.2)' : 'none',
      }}
    />
  )
}

interface ActivityCardItemProps {
  activity: Activity
  index: number
  isActive: boolean
  isExpanded: boolean
  isLast: boolean
  onCardClick: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
  isShareMode?: boolean
}

function ActivityCardItem({ activity, index, isActive, isExpanded, isLast, onCardClick, onEdit, onDelete, isShareMode = false }: ActivityCardItemProps) {
  const isHotel = activity.activity_type === 'hotel'
  const hotelName = isHotel
    ? (activity.extra_data as Record<string, unknown> | null)?.hotel_name as string | undefined ?? activity.name
    : null
  const displayName = isHotel ? hotelName : activity.name
  const starRating = isHotel ? (activity.extra_data as Record<string, unknown> | null)?.star_rating as number | undefined : undefined
  const checkIn = isHotel ? (activity.extra_data as Record<string, unknown> | null)?.check_in as string | undefined : undefined
  const checkOut = isHotel ? (activity.extra_data as Record<string, unknown> | null)?.check_out as string | undefined : undefined
  const photoUrl = !isHotel ? (activity.extra_data as Record<string, unknown> | null)?.photo_url as string | undefined : undefined
  const placesRating = (activity.extra_data as Record<string, unknown> | null)?.places_rating as number | undefined
  const placesReviewCount = (activity.extra_data as Record<string, unknown> | null)?.places_review_count as number | undefined
  const placesPriceLevel = (activity.extra_data as Record<string, unknown> | null)?.places_price_level as number | undefined

  return (
    <motion.div
      id={`activity-${activity.id}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`relative ${isLast ? '' : 'mb-1'}`}
    >
      {/* Card */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
        style={{
          background: isActive
            ? 'rgba(255,255,255,0.95)'
            : isExpanded
            ? 'rgba(255,255,255,0.88)'
            : 'rgba(255,255,255,0.65)',
          border: isActive
            ? '1px solid rgba(214,121,64,0.35)'
            : '1px solid rgba(204,217,226,0.5)',
          boxShadow: isActive
            ? '0 4px 16px rgba(40,81,133,0.1), 0 1px 4px rgba(40,81,133,0.06)'
            : '0 1px 4px rgba(40,81,133,0.04)',
        }}
        onClick={onCardClick}
      >
        {/* Photo header */}
        {photoUrl && (
          <div className="relative w-full overflow-hidden rounded-t-xl" style={{ height: '128px' }}>
            <Image
              src={photoUrl}
              alt={activity.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(40,81,133,0.4) 0%, transparent 60%)' }} />
          </div>
        )}

        {/* Active left accent */}
        {isActive && (
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
            style={{ background: '#D67940' }}
          />
        )}

        {/* Main row */}
        <div className="flex items-center gap-3 px-3 py-2.5 pl-4">
          {/* Icon */}
          <div className="shrink-0 flex items-center justify-center w-7">
            {isHotel ? <HotelIcon /> : <ActivityIcon isActive={isActive} />}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-snug"
               style={{ color: isActive ? '#285185' : 'rgba(40,81,133,0.85)' }}>
              {displayName}
            </p>
            {activity.location && !isExpanded && (
              <p className="text-[11px] truncate flex items-center gap-1 mt-0.5"
                 style={{ color: 'rgba(111,72,73,0.55)' }}>
                <svg width="8" height="9" viewBox="0 0 8 10" fill="none" className="shrink-0 opacity-70">
                  <path d="M4 0C1.794 0 0 1.794 0 4C0 6.628 4 10 4 10C4 10 8 6.628 8 4C8 1.794 6.206 0 4 0Z" fill="#6F4849"/>
                  <circle cx="4" cy="4" r="1.5" fill="white"/>
                </svg>
                {activity.location}
              </p>
            )}
          </div>

          {/* Right badge */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isHotel ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-widest uppercase"
                    style={{ color: 'rgba(40,81,133,0.5)', background: 'rgba(40,81,133,0.08)' }}>
                Stay
              </span>
            ) : (
              <TimeChip time={activity.time} />
            )}
            {/* Expand chevron */}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              className="transition-transform duration-200 opacity-30"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M6 9l6 6 6-6" stroke="#285185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 pt-1 space-y-2"
                   style={{ borderTop: '1px solid rgba(204,217,226,0.4)' }}>
                {/* Location full */}
                {activity.location && (
                  <div className="flex items-start gap-2">
                    <svg width="10" height="12" viewBox="0 0 8 10" fill="none" className="shrink-0 mt-0.5 opacity-50">
                      <path d="M4 0C1.794 0 0 1.794 0 4C0 6.628 4 10 4 10C4 10 8 6.628 8 4C8 1.794 6.206 0 4 0Z" fill="#6F4849"/>
                      <circle cx="4" cy="4" r="1.5" fill="white"/>
                    </svg>
                    <span className="text-xs leading-snug" style={{ color: 'rgba(111,72,73,0.7)' }}>
                      {activity.location}
                    </span>
                  </div>
                )}

                {/* Rating / price row */}
                {(placesRating !== undefined || placesPriceLevel !== undefined) && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {placesRating !== undefined && (
                      <>
                        <span style={{ color: '#D67940' }}>★ {placesRating.toFixed(1)}</span>
                        {placesReviewCount !== undefined && (
                          <span style={{ color: 'rgba(111,72,73,0.5)' }}>({placesReviewCount.toLocaleString()})</span>
                        )}
                      </>
                    )}
                    {placesPriceLevel !== undefined && (
                      <span style={{ color: 'rgba(40,81,133,0.5)' }}>{PRICE_SYMBOLS[placesPriceLevel]}</span>
                    )}
                  </div>
                )}

                {/* Description */}
                {activity.description && (
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(40,81,133,0.6)' }}>
                    {activity.description}
                  </p>
                )}

                {/* Hotel extras */}
                {isHotel && (checkIn || checkOut || starRating) && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {starRating && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(40,81,133,0.07)', color: '#285185' }}>
                        {'★'.repeat(starRating)} {starRating}-star
                      </span>
                    )}
                    {checkIn && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(214,121,64,0.08)', color: '#D67940' }}>
                        In: {checkIn}
                      </span>
                    )}
                    {checkOut && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(214,121,64,0.08)', color: '#D67940' }}>
                        Out: {checkOut}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions — hidden in share/read-only mode */}
                {!isShareMode && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={e => { e.stopPropagation(); onEdit() }}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-150"
                      style={{ color: '#285185', background: 'rgba(40,81,133,0.08)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete() }}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-150"
                      style={{ color: 'rgba(200,50,50,0.7)', background: 'rgba(200,50,50,0.06)' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function DaySectionInner({
  dayNumber,
  activities,
  activeActivityId,
  onActivityClick,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isShareMode = false,
}: DaySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleCardClick(id: string) {
    setExpandedId(prev => prev === id ? null : id)
    onActivityClick(id)
  }

  return (
    <section className="mb-5">
      {/* Day header */}
      <div className="flex items-center gap-2.5 mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black text-white"
            style={{ background: '#285185' }}
          >
            {dayNumber}
          </div>
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase"
                style={{ color: 'rgba(40,81,133,0.7)' }}>
            Day {dayNumber}
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(204,217,226,0.7), transparent)' }} />
        {activities.length > 0 && (
          <span className="text-[10px] font-medium shrink-0" style={{ color: 'rgba(111,72,73,0.4)' }}>
            {activities.length}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative pl-5">
        {/* Vertical connector line */}
        {activities.length > 0 && (
          <div
            className="absolute top-3 w-px"
            style={{
              left: '9px',
              bottom: '0.5rem',
              background: 'linear-gradient(to bottom, rgba(204,217,226,0.8), rgba(204,217,226,0.1))',
            }}
          />
        )}

        <div className="space-y-1.5">
          {activities.map((activity, index) => (
            <ActivityCardItem
              key={activity.id}
              activity={activity}
              index={index}
              isActive={activeActivityId === activity.id}
              isExpanded={expandedId === activity.id}
              isLast={index === activities.length - 1}
              onCardClick={() => handleCardClick(activity.id)}
              onEdit={() => onEditActivity(activity)}
              onDelete={() => onDeleteActivity(activity.id)}
              isShareMode={isShareMode}
            />
          ))}
        </div>

        {/* Add button — hidden in share/read-only mode */}
        {!isShareMode && (
          <button
            onClick={() => onAddActivity(dayNumber)}
            className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 group"
            style={{ color: 'rgba(111,72,73,0.4)' }}
          >
            <div
              className="w-4 h-4 rounded-full border border-dashed flex items-center justify-center transition-colors duration-150 group-hover:border-[#D67940]"
              style={{ borderColor: 'rgba(204,217,226,0.6)' }}
            >
              <span className="text-[9px] leading-none group-hover:text-[#D67940]">+</span>
            </div>
            <span className="group-hover:text-[#D67940] transition-colors">Add activity</span>
          </button>
        )}
      </div>
    </section>
  )
}

export const DaySection = React.memo(DaySectionInner)
