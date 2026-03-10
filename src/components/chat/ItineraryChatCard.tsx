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
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
      <p className="font-semibold text-sm">{data.title}</p>
      <p className="text-xs text-blue-700 mt-0.5">{data.destination}</p>
      <p className="text-xs text-blue-600 mt-1">
        {data.start_date} — {data.end_date}
      </p>
      <p className="text-xs text-blue-500 mt-1">
        {data.dayCount} days · {data.activityCount} activities
      </p>
    </div>
  )
}
