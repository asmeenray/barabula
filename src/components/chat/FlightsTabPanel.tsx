'use client'

import { useState } from 'react'
import type { TripState } from '@/lib/types'

export interface FlightInputData {
  origin_city: string
  outbound_airline: string
  outbound_flight_number: string
  outbound_from: string
  outbound_to: string
  outbound_departure: string
  outbound_arrival: string
  return_airline: string
  return_flight_number: string
  return_from: string
  return_to: string
  return_departure: string
  return_arrival: string
}

interface FlightsTabPanelProps {
  tripState: Partial<TripState>
  initialData: FlightInputData | null
  onSave: (data: FlightInputData) => void
  onClose: () => void
}

const inputClass =
  'w-full border border-sky/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white text-navy placeholder-umber/40'

const labelClass = 'block text-xs font-medium text-umber mb-1'

export function FlightsTabPanel({ tripState, initialData, onSave, onClose }: FlightsTabPanelProps) {
  const origin = tripState.origin ?? ''

  const [originCity, setOriginCity] = useState(initialData?.origin_city ?? origin)
  const [outboundAirline, setOutboundAirline] = useState(initialData?.outbound_airline ?? '')
  const [outboundFlightNumber, setOutboundFlightNumber] = useState(initialData?.outbound_flight_number ?? '')
  const [outboundFrom, setOutboundFrom] = useState(initialData?.outbound_from ?? origin)
  const [outboundTo, setOutboundTo] = useState(initialData?.outbound_to ?? '')
  const [outboundDeparture, setOutboundDeparture] = useState(initialData?.outbound_departure ?? '')
  const [outboundArrival, setOutboundArrival] = useState(initialData?.outbound_arrival ?? '')
  const [returnAirline, setReturnAirline] = useState(initialData?.return_airline ?? '')
  const [returnFlightNumber, setReturnFlightNumber] = useState(initialData?.return_flight_number ?? '')
  const [returnFrom, setReturnFrom] = useState(initialData?.return_from ?? '')
  const [returnTo, setReturnTo] = useState(initialData?.return_to ?? origin)
  const [returnDeparture, setReturnDeparture] = useState(initialData?.return_departure ?? '')
  const [returnArrival, setReturnArrival] = useState(initialData?.return_arrival ?? '')

  function handleSave() {
    onSave({
      origin_city: originCity,
      outbound_airline: outboundAirline,
      outbound_flight_number: outboundFlightNumber,
      outbound_from: outboundFrom,
      outbound_to: outboundTo,
      outbound_departure: outboundDeparture,
      outbound_arrival: outboundArrival,
      return_airline: returnAirline,
      return_flight_number: returnFlightNumber,
      return_from: returnFrom,
      return_to: returnTo,
      return_departure: returnDeparture,
      return_arrival: returnArrival,
    })
    onClose()
  }

  return (
    <div className="border border-sky/30 rounded-2xl bg-white/95 shadow-lg mx-3 mb-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-navy">Flight Details</h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-umber/50 hover:text-umber transition-colors text-base leading-none"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {/* Origin city */}
        <div>
          <label className={labelClass}>Origin city</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. London"
            value={originCity}
            onChange={e => setOriginCity(e.target.value)}
          />
        </div>

        {/* Outbound flight */}
        <div>
          <p className="text-xs font-semibold text-coral mb-2 uppercase tracking-wide">Outbound flight</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Airline</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Airline (e.g. British Airways)"
                value={outboundAirline}
                onChange={e => setOutboundAirline(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Flight #</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. BA287"
                value={outboundFlightNumber}
                onChange={e => setOutboundFlightNumber(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>From</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. LHR"
                value={outboundFrom}
                onChange={e => setOutboundFrom(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. NRT"
                value={outboundTo}
                onChange={e => setOutboundTo(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Departure</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Departure time (e.g. 09:00)"
                value={outboundDeparture}
                onChange={e => setOutboundDeparture(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Arrival</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. 06:30+1"
                value={outboundArrival}
                onChange={e => setOutboundArrival(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Return flight */}
        <div>
          <p className="text-xs font-semibold text-coral mb-2 uppercase tracking-wide">Return flight</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Airline</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Airline (e.g. British Airways)"
                value={returnAirline}
                onChange={e => setReturnAirline(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Flight #</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. BA288"
                value={returnFlightNumber}
                onChange={e => setReturnFlightNumber(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>From</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. NRT"
                value={returnFrom}
                onChange={e => setReturnFrom(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. LHR"
                value={returnTo}
                onChange={e => setReturnTo(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Departure</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Departure time (e.g. 11:00)"
                value={returnDeparture}
                onChange={e => setReturnDeparture(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Arrival</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. 14:30"
                value={returnArrival}
                onChange={e => setReturnArrival(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        className="mt-4 w-full bg-coral text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-coral/90 transition-colors"
      >
        Save flight details
      </button>
    </div>
  )
}
