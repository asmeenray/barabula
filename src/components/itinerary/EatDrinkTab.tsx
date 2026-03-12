'use client'

import { useState } from 'react'
import type { DailyFood } from '@/lib/types'

interface EatDrinkTabProps {
  dailyFood: DailyFood[]
  itineraryId: string
  onSave: (updated: DailyFood[]) => Promise<void>
}

export function EatDrinkTab({ dailyFood, itineraryId: _itineraryId, onSave }: EatDrinkTabProps) {
  const [draft, setDraft] = useState<DailyFood[]>(
    [...dailyFood].sort((a, b) => a.day_number - b.day_number)
  )
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  function startEditDay(dayNumber: number) {
    setEditingDay(dayNumber)
  }

  function cancelEditDay(dayNumber: number) {
    // Reset this day's draft to original
    const original = dailyFood.find(f => f.day_number === dayNumber)
    if (original) {
      setDraft(prev => prev.map(f => (f.day_number === dayNumber ? { ...original } : f)))
    }
    setEditingDay(null)
  }

  function updateField(
    dayNumber: number,
    field: keyof DailyFood,
    value: string
  ) {
    setDraft(prev =>
      prev.map(f =>
        f.day_number === dayNumber
          ? { ...f, [field]: value || null }
          : f
      )
    )
  }

  async function handleSave(dayNumber: number) {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditingDay(null)
    // also sync back so "Cancel" would use the saved values next time
    // (dailyFood prop would update via mutate() in parent)
  }

  const inputClass =
    'w-full border border-sky/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral'

  if (draft.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-umber/60">
        No dinner recommendations yet.
      </div>
    )
  }

  return (
    <div className="space-y-3 px-3 py-4">
      {draft.map(food => {
        const isEditing = editingDay === food.day_number
        return (
          <div
            key={food.day_number}
            className="relative bg-white/70 border border-sky/30 rounded-2xl p-4 shadow-sm"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-navy">Day {food.day_number}</span>
              {!isEditing && (
                <button
                  onClick={() => startEditDay(food.day_number)}
                  className="text-xs font-medium text-coral hover:text-umber transition-colors"
                  aria-label={`Edit day ${food.day_number}`}
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-umber block mb-1">Restaurant</label>
                  <input
                    type="text"
                    value={food.dinner_restaurant ?? ''}
                    onChange={e => updateField(food.day_number, 'dinner_restaurant', e.target.value)}
                    placeholder="Restaurant name"
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-umber block mb-1">Area</label>
                    <input
                      type="text"
                      value={food.dinner_area ?? ''}
                      onChange={e => updateField(food.day_number, 'dinner_area', e.target.value)}
                      placeholder="Neighbourhood"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-umber block mb-1">Cuisine</label>
                    <input
                      type="text"
                      value={food.dinner_cuisine ?? ''}
                      onChange={e => updateField(food.day_number, 'dinner_cuisine', e.target.value)}
                      placeholder="e.g. Sushi"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-umber block mb-1">Local tip</label>
                  <input
                    type="text"
                    value={food.local_tip ?? ''}
                    onChange={e => updateField(food.day_number, 'local_tip', e.target.value)}
                    placeholder="e.g. Reserve in advance"
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => cancelEditDay(food.day_number)}
                    className="px-3 py-1.5 text-xs font-medium text-umber hover:text-navy rounded-xl hover:bg-sky/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(food.day_number)}
                    disabled={saving}
                    className="px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-umber disabled:opacity-40 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* Read view */
              <div>
                <p className="text-sm font-semibold text-navy">
                  {food.dinner_restaurant ?? '—'}
                </p>
                {(food.dinner_cuisine || food.dinner_area) && (
                  <p className="text-xs text-umber/70 mt-0.5">
                    {[food.dinner_cuisine, food.dinner_area].filter(Boolean).join(' · ')}
                  </p>
                )}
                {food.local_tip && (
                  <p className="text-xs text-umber/60 mt-1.5 italic">{food.local_tip}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
