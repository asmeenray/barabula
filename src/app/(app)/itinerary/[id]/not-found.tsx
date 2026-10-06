import Link from 'next/link'
import { TopBar } from '@/components/shell/TopBar'

// Trip not found / no access (UI-SPEC §12, Copywriting "Trip not found").
// Board-style empty page; the same page answers for a wrong id and for a trip
// that belongs to someone else, so it never confirms that a trip exists.

export default function TripNotFound() {
  return (
    <>
      <TopBar variant="inner" back={{ href: '/', label: 'Trips' }} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-board text-board-ink">
        <div className="mx-auto max-w-[560px] px-4 pt-12 pb-16">
          <h1 className="text-[22px] leading-[1.2] font-semibold">{"This trip isn't on the board"}</h1>
          <p className="mt-2 text-base text-board-muted">It may have been deleted, or the link is wrong.</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-ink px-6 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Back to trips
          </Link>
        </div>
      </div>
    </>
  )
}
