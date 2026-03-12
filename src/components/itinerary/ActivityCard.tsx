'use client'
import { motion } from 'motion/react'
import type { Activity } from '@/lib/types'

interface ActivityCardProps {
  activity: Activity
  isActive?: boolean
  sequenceNumber?: number
  onCardClick?: () => void
}

export function ActivityCard({ activity, isActive = false, sequenceNumber, onCardClick }: ActivityCardProps) {
  return (
    <motion.div
      layout
      onClick={onCardClick}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className="relative rounded-2xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.60)',
        backdropFilter: 'blur(12px)',
        border: isActive
          ? '1px solid rgba(214,121,64,0.30)'
          : '1px solid rgba(255,255,255,0.40)',
        boxShadow: isActive
          ? '0 4px 20px rgba(214,121,64,0.10), 0 1px 4px rgba(40,81,133,0.06)'
          : '0 1px 4px rgba(40,81,133,0.04)',
      }}
    >
      {/* Active left accent bar */}
      {isActive && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: '#D67940' }}
        />
      )}

      <div className="flex items-start gap-3 pl-1">
        {/* Sequence number */}
        {sequenceNumber !== undefined && (
          <div
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
            style={
              isActive
                ? {
                    background: '#D67940',
                    color: 'white',
                    boxShadow: '0 0 0 3px rgba(214,121,64,0.20)',
                  }
                : {
                    background: '#F5EDE3',
                    color: '#D67940',
                    border: '1px solid rgba(214,121,64,0.20)',
                  }
            }
          >
            {sequenceNumber}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-snug" style={{ color: '#285185' }}>
              {activity.name}
            </p>
            {activity.time && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 tracking-wide"
                style={
                  isActive
                    ? { background: '#D67940', color: 'white' }
                    : { background: 'rgba(214,121,64,0.10)', color: '#D67940' }
                }
              >
                {activity.time}
              </span>
            )}
          </div>

          {activity.location && (
            <p className="text-xs flex items-center gap-1 mt-1.5" style={{ color: 'rgba(111,72,73,0.70)' }}>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="shrink-0 opacity-60">
                <path d="M5 0C2.794 0 1 1.794 1 4C1 6.628 5 12 5 12C5 12 9 6.628 9 4C9 1.794 7.206 0 5 0Z" fill="#6F4849"/>
                <circle cx="5" cy="4" r="1.5" fill="white"/>
              </svg>
              <span className="line-clamp-1">{activity.location}</span>
            </p>
          )}

          {activity.description && (
            <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(111,72,73,0.60)' }}>
              {activity.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
