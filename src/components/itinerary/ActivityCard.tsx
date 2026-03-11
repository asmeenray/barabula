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
      className={`rounded-2xl p-4 cursor-pointer border transition-all ${
        isActive
          ? 'border-coral ring-1 ring-coral/20 shadow-md bg-white'
          : 'border-sky/40 bg-white hover:border-sky hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Sequence number circle */}
        {sequenceNumber !== undefined && (
          <div className="w-8 h-8 rounded-full bg-coral text-white text-xs font-bold flex items-center justify-center shrink-0">
            {sequenceNumber}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-navy text-sm">{activity.name}</p>
            {activity.time && (
              <span className="text-xs text-coral font-medium bg-coral/10 px-2 py-0.5 rounded-full shrink-0">
                {activity.time}
              </span>
            )}
          </div>

          {activity.location && (
            <p className="text-xs text-umber flex items-center gap-1 mt-1">
              <span>📍</span>
              <span>{activity.location}</span>
            </p>
          )}

          {activity.description && (
            <p className="text-xs text-umber/80 mt-2 leading-relaxed line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
