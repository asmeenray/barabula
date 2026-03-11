'use client'
import { useEffect, useRef } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

export interface MapPin {
  id: string
  name: string
  day: number
  lng: number
  lat: number
  type: 'activity' | 'hotel'
  sequenceNumber?: number
}

interface ItineraryMapProps {
  pins: MapPin[]
  activeDay: number | null
  activeActivityId: string | null
  onPinClick: (id: string) => void
}

export default function ItineraryMap({
  pins,
  activeDay,
  activeActivityId,
  onPinClick,
}: ItineraryMapProps) {
  const mapRef = useRef<MapRef>(null)
  const visiblePins = activeDay !== null ? pins.filter(p => p.day === activeDay) : pins

  useEffect(() => {
    if (!activeActivityId || !mapRef.current) return
    const pin = pins.find(p => p.id === activeActivityId)
    if (pin) {
      mapRef.current.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 800 })
    }
  }, [activeActivityId, pins])

  return (
    <Map
      ref={mapRef}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      {visiblePins.map(pin => {
        const isActive = activeActivityId === pin.id
        const bgColor = pin.type === 'hotel' ? '#285185' : '#D67940'

        return (
          <Marker key={pin.id} longitude={pin.lng} latitude={pin.lat} anchor="bottom">
            <button
              onClick={() => onPinClick(pin.id)}
              title={pin.name}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: isActive
                  ? '0 4px 16px rgba(0,0,0,0.4)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bgColor,
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transform: isActive ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                outline: 'none',
              }}
              aria-label={`${pin.name} — Day ${pin.day}`}
            >
              {pin.type === 'hotel' ? '★' : (pin.sequenceNumber ?? pin.day)}
            </button>
          </Marker>
        )
      })}
    </Map>
  )
}
