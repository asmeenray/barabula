'use client'

import { useState } from 'react'
import type { Flight } from '@/lib/types'

interface FlightCardProps {
  flight: Flight
  onSave: (updated: Flight) => Promise<void>
}

export function FlightCard({ flight, onSave }: FlightCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftAirline, setDraftAirline] = useState(flight.airline ?? '')
  const [draftFlightNumber, setDraftFlightNumber] = useState(flight.flight_number ?? '')
  const [draftFromAirport, setDraftFromAirport] = useState(flight.from_airport ?? '')
  const [draftToAirport, setDraftToAirport] = useState(flight.to_airport ?? '')
  const [draftDepartureTime, setDraftDepartureTime] = useState(flight.departure_time ?? '')
  const [draftArrivalTime, setDraftArrivalTime] = useState(flight.arrival_time ?? '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraftAirline(flight.airline ?? '')
    setDraftFlightNumber(flight.flight_number ?? '')
    setDraftFromAirport(flight.from_airport ?? '')
    setDraftToAirport(flight.to_airport ?? '')
    setDraftDepartureTime(flight.departure_time ?? '')
    setDraftArrivalTime(flight.arrival_time ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setDraftAirline(flight.airline ?? '')
    setDraftFlightNumber(flight.flight_number ?? '')
    setDraftFromAirport(flight.from_airport ?? '')
    setDraftToAirport(flight.to_airport ?? '')
    setDraftDepartureTime(flight.departure_time ?? '')
    setDraftArrivalTime(flight.arrival_time ?? '')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      ...flight,
      airline: draftAirline.trim() || null,
      flight_number: draftFlightNumber.trim() || null,
      from_airport: draftFromAirport.trim() || null,
      to_airport: draftToAirport.trim() || null,
      departure_time: draftDepartureTime.trim() || null,
      arrival_time: draftArrivalTime.trim() || null,
    })
    setSaving(false)
    setEditing(false)
  }

  const inputClass =
    'w-full border border-sky/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral'

  return (
    <div
      className="relative bg-white/70 border border-sky/30 rounded-2xl p-4 shadow-sm mb-3"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Direction badge + suggested badge */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            flight.direction === 'outbound'
              ? 'bg-navy/10 text-navy'
              : 'bg-umber/10 text-umber'
          }`}
        >
          {flight.direction === 'outbound' ? 'Outbound' : 'Return'}
        </span>
        {flight.is_suggested && (
          <span className="bg-sky/40 text-umber text-xs rounded-full px-2 py-0.5">
            Suggested — tap to edit
          </span>
        )}
        {/* Edit button — top right */}
        {!editing && (
          <button
            onClick={startEdit}
            className="ml-auto text-xs font-medium text-coral hover:text-umber transition-colors"
            aria-label="Edit flight"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-umber block mb-1">Airline</label>
              <input
                type="text"
                value={draftAirline}
                onChange={e => setDraftAirline(e.target.value)}
                placeholder="e.g. Japan Airlines"
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-umber block mb-1">Flight no.</label>
              <input
                type="text"
                value={draftFlightNumber}
                onChange={e => setDraftFlightNumber(e.target.value)}
                placeholder="e.g. JL417"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs font-medium text-umber block mb-1">From</label>
              <input
                type="text"
                value={draftFromAirport}
                onChange={e => setDraftFromAirport(e.target.value)}
                placeholder="e.g. LHR"
                className={inputClass}
              />
            </div>
            <span className="text-umber mt-4">✈</span>
            <div className="flex-1">
              <label className="text-xs font-medium text-umber block mb-1">To</label>
              <input
                type="text"
                value={draftToAirport}
                onChange={e => setDraftToAirport(e.target.value)}
                placeholder="e.g. NRT"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-umber block mb-1">Departure</label>
              <input
                type="text"
                value={draftDepartureTime}
                onChange={e => setDraftDepartureTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-umber block mb-1">Arrival</label>
              <input
                type="text"
                value={draftArrivalTime}
                onChange={e => setDraftArrivalTime(e.target.value)}
                placeholder="e.g. 7:00 AM"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-umber hover:text-navy rounded-xl hover:bg-sky/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
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
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm text-umber">✈</span>
            <span className="text-sm font-semibold text-navy">{flight.airline ?? '—'}</span>
            {flight.flight_number && (
              <span className="text-xs text-umber/70 ml-1">{flight.flight_number}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-umber">
            <span className="font-mono font-semibold">{flight.from_airport ?? '—'}</span>
            <span className="text-xs">→</span>
            <span className="font-mono font-semibold">{flight.to_airport ?? '—'}</span>
          </div>
          <div className="flex gap-4 mt-1.5 text-xs text-umber/80">
            {flight.departure_time && (
              <span>Dep: <span className="font-medium">{flight.departure_time}</span></span>
            )}
            {flight.arrival_time && (
              <span>Arr: <span className="font-medium">{flight.arrival_time}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
