'use client'
import { useEffect, useRef, useState } from 'react'
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre'
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

// Teardrop pin SVG — elegant location marker shape
function PinMarker({
  pin,
  isActive,
  onClick,
}: {
  pin: MapPin
  isActive: boolean
  onClick: () => void
}) {
  const isHotel = pin.type === 'hotel'
  const color = isHotel ? '#285185' : '#D67940'
  const size = isActive ? 44 : 36

  return (
    <button
      onClick={onClick}
      title={pin.name}
      aria-label={`${pin.name} — Day ${pin.day}`}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: size,
        height: size + 8,
        transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s ease',
        filter: isActive
          ? `drop-shadow(0 4px 12px ${color}99)`
          : 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
        outline: 'none',
      }}
    >
      <svg
        width={size}
        height={size + 8}
        viewBox="0 0 44 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pin body */}
        <path
          d="M22 2C13.163 2 6 9.163 6 18C6 28.628 22 50 22 50C22 50 38 28.628 38 18C38 9.163 30.837 2 22 2Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
        {/* Inner circle */}
        <circle cx="22" cy="18" r="8" fill="white" fillOpacity="0.9" />
        {/* Label inside */}
        <text
          x="22"
          y="22"
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {isHotel ? '★' : (pin.sequenceNumber ?? pin.day)}
        </text>
      </svg>
    </button>
  )
}

export default function ItineraryMap({
  pins,
  activeDay,
  activeActivityId,
  onPinClick,
}: ItineraryMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  const visiblePins = activeDay !== null ? pins.filter(p => p.day === activeDay) : pins

  // Fly to active pin
  useEffect(() => {
    if (!activeActivityId || !mapRef.current) return
    const pin = pins.find(p => p.id === activeActivityId)
    if (pin) {
      mapRef.current.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 900, essential: true })
    }
  }, [activeActivityId, pins])

  // Auto-fit bounds when pins load
  useEffect(() => {
    if (!mapRef.current || visiblePins.length === 0) return
    if (visiblePins.length === 1) {
      mapRef.current.flyTo({ center: [visiblePins[0].lng, visiblePins[0].lat], zoom: 13, duration: 600 })
      return
    }
    const lngs = visiblePins.map(p => p.lng)
    const lats = visiblePins.map(p => p.lat)
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 14 })
  }, [visiblePins.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const popupPin = hoveredPin ? visiblePins.find(p => p.id === hoveredPin) : null

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        // Carto Positron — clean monochrome, elegant, premium
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {visiblePins.map(pin => (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
          >
            <div
              onMouseEnter={() => setHoveredPin(pin.id)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <PinMarker
                pin={pin}
                isActive={activeActivityId === pin.id}
                onClick={() => onPinClick(pin.id)}
              />
            </div>
          </Marker>
        ))}

        {/* Hover popup */}
        {popupPin && (
          <Popup
            longitude={popupPin.lng}
            latitude={popupPin.lat}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={[0, -8] as [number, number]}
          >
            <div style={{
              background: 'rgba(40, 81, 133, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
              fontFamily: 'Inter, sans-serif',
              maxWidth: '160px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              {popupPin.name}
            </div>
          </Popup>
        )}
      </Map>

      {/* Pin count badge */}
      {visiblePins.length > 0 && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-navy shadow-sm border border-sky/30">
          {visiblePins.length} {visiblePins.length === 1 ? 'location' : 'locations'}
        </div>
      )}

      {/* Empty state */}
      {visiblePins.length === 0 && pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-4 text-center shadow-sm border border-sky/30">
            <div className="text-2xl mb-1">🗺️</div>
            <p className="text-sm font-medium text-navy">Map loads when activities have locations</p>
            <p className="text-xs text-umber/60 mt-0.5">Add locations to see pins</p>
          </div>
        </div>
      )}
    </div>
  )
}
