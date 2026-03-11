interface ItineraryChatCardData {
  title: string
  destination: string
  start_date: string
  end_date: string
  dayCount: number
  activityCount: number
}

export function ItineraryChatCard({ data }: { data: ItineraryChatCardData }) {
  return (
    <div className="rounded-xl border border-sky-dark/50 bg-sky/20 p-3 text-navy">
      <p className="font-semibold text-sm">{data.title}</p>
      <p className="text-xs text-umber mt-0.5">{data.destination}</p>
      <p className="text-xs text-umber/80 mt-1">
        {data.start_date} — {data.end_date}
      </p>
      <p className="text-xs text-umber/60 mt-1">
        {data.dayCount} days · {data.activityCount} activities
      </p>
    </div>
  )
}
