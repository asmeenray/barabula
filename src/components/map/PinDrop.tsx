'use client'

// Moment 2 "place lands in plan" (16-22, D-30, UI-SPEC Motion): one DOM marker
// for the just-located pin. The MapLibre marker root is only positioned; the
// drop (translateY(-26px) scale(.9) → one small bounce with a 1.06/0.94 squash
// at 85%, 520 ms after 420 ms) and the pulse ring (scale 0.8 → 1.9, opacity
// 0.7 → 0, 520 ms) run on inner elements as CSS keyframes (globals.css), so the
// plan route loads no animation runtime (Q63). Under reduced motion the pin
// only fades in (150 ms) and there is no ring. The pin is drawn with the same
// canvas image as the symbol-layer pin, which takes over when TripMap removes
// this marker. Not focusable, not announced: the list is the accessible
// equivalent (UI-SPEC Accessibility "Map").
// Loaded through React.lazy on the first drop, so the map chunk stays as it was.

import { useEffect, useRef } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { drawPin, parsePinImageId } from './pinImages'

type Props = {
  lng: number
  lat: number
  /** The pin's symbol image id (pinImageId), drawn the same way here. */
  image: string
  reduced: boolean
}

export default function PinDrop({ lng, lat, image, reduced }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const spec = parsePinImageId(image)
    if (!canvas || !spec) return
    const ratio = window.devicePixelRatio || 1
    const data = drawPin(spec, ratio)
    canvas.width = data.width
    canvas.height = data.height
    canvas.style.width = `${data.width / ratio}px`
    canvas.style.height = `${data.height / ratio}px`
    canvas.getContext('2d')?.putImageData(data, 0, 0)
  }, [image])

  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom" style={{ pointerEvents: 'none' }}>
      <div aria-hidden="true" data-pin-drop={reduced ? 'fade' : 'drop'} className="relative">
        {!reduced && <span className="pin-drop-ring" />}
        <div className={reduced ? 'pin-drop-fade' : 'pin-drop'}>
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </Marker>
  )
}
