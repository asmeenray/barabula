'use client'

interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="grid grid-cols-2 h-screen overflow-hidden" data-testid="split-layout">
      {/* Left panel — chat thread */}
      <div className="flex flex-col h-screen overflow-hidden border-r border-gray-100">
        {left}
      </div>
      {/* Right panel — ambient / itinerary */}
      <div className="relative h-screen overflow-hidden bg-gray-950">
        {right}
      </div>
    </div>
  )
}
