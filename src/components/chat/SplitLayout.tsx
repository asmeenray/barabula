'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  const [leftPct, setLeftPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPct(Math.min(Math.max(pct, 25), 75))
  }, [])

  const stopDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      document.body.classList.remove('dragging-panel')
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }
  }, [onMouseMove, stopDrag])

  function startDrag() {
    isDragging.current = true
    document.body.classList.add('dragging-panel')
  }

  return (
    <div
      ref={containerRef}
      className="flex h-screen overflow-hidden"
      data-testid="split-layout"
    >
      {/* Left panel — chat */}
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ width: `${leftPct}%` }}
      >
        {left}
      </div>

      {/* Drag handle */}
      <div
        className="group relative shrink-0 w-1.5 h-full cursor-col-resize flex items-center justify-center hover:w-2 transition-all duration-150"
        onMouseDown={startDrag}
      >
        {/* Track line */}
        <div className="absolute inset-y-0 w-px bg-sand-dark/50 group-hover:bg-coral/30 transition-colors" />
        {/* Grab dots */}
        <div className="relative z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-coral/50" />
          ))}
        </div>
      </div>

      {/* Right panel — context/itinerary */}
      <div
        className="relative h-screen overflow-hidden bg-gray-950"
        style={{ width: `${100 - leftPct - 0.375}%` }}
      >
        {right}
      </div>
    </div>
  )
}
