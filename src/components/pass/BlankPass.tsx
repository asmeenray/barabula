'use client'

// The blank "next trip" pass, the home page's hero (UI-SPEC §4, D-09…D-18).
// Cover: the random curated city the server picked (D-09), then the first
// stop's photo or its city-map cover once a city is set. Body: the printed
// stamp lines, the one-question-at-a-time card and, as soon as one city is
// set, Start planning (D-10), which creates the trip and opens its empty plan
// (D-18). No From field and no flights link (D-14).

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CityPhoto } from '@/lib/photos/manifest'
import { findCity } from '@/lib/photos/normalize'
import { passTitle } from '@/lib/pass/format'
import type { PassAnswers, PassCity } from '@/lib/pass/types'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { PassCover, PhotoCredit } from './PassCover'
import { QuestionCard, type QuestionStep } from './QuestionCard'
import { StampLine } from './StampLine'

type Props = {
  /** The server's random curated city (getHomeData), shown until a city is chosen. */
  coverPhoto: CityPhoto
  /** The curated set: offered first in "Where to?" and used for the chosen city's cover. */
  photos: readonly CityPhoto[]
  signedIn: boolean
}

const EMPTY: PassAnswers = { stops: [], when: null, adults: null, kids: null, interests: [], note: null }

type CreateState = 'idle' | 'creating' | 'failed'

export function BlankPass({ coverPhoto, photos, signedIn }: Props) {
  const router = useRouter()
  const announce = useAnnounce()
  const [answers, setAnswers] = useState<PassAnswers>(EMPTY)
  const [step, setStep] = useState<QuestionStep>(1)
  const [focusSignal, setFocusSignal] = useState(0)
  const [create, setCreate] = useState<CreateState>('idle')
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  // One id per pass, so a retried create returns the same trip (Pitfall 7).
  const clientRef = useRef<string | null>(null)

  const cities = useMemo<PassCity[]>(
    () => photos.map((p) => ({ name: p.city, names: p.names, code: p.iata })),
    [photos]
  )
  const codeOf = (stop: string) => findCity(cities, stop)?.code

  const { stops } = answers
  const first = stops[0]
  const photo = first ? findCity(photos, first) : coverPhoto
  const coverCity = first ?? coverPhoto.city
  const title = first ? passTitle(stops, codeOf) : 'Where to next?'
  const code = stops.length === 1 ? codeOf(first) : undefined
  const showCredit = photo && failedSlug !== photo.slug

  function goTo(next: QuestionStep) {
    setStep(next)
    setFocusSignal((n) => n + 1)
  }

  function setStops(next: string[]) {
    setAnswers((a) => ({ ...a, stops: next }))
    if (next.length) announce(`To: ${next.join(', then ')}`)
  }

  async function startPlanning() {
    if (create === 'creating') return
    if (!signedIn) {
      // 16-15 replaces this with sign-in that keeps the answers (D-19).
      router.push('/login')
      return
    }
    clientRef.current ??= crypto.randomUUID()
    setCreate('creating')
    try {
      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...answers, client_ref: clientRef.current }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const { id } = (await res.json()) as { id: string }
      router.push(`/itinerary/${id}`)
    } catch {
      setCreate('failed')
    }
  }

  return (
    <section
      aria-label="Next trip"
      className="overflow-hidden rounded-2xl bg-surface shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] dark:border dark:border-line dark:shadow-none"
    >
      <PassCover
        key={photo?.slug ?? `map:${coverCity}`}
        variant="blank"
        photo={photo}
        cityName={coverCity}
        title={title}
        stateLabel="Next trip"
        code={code}
        statusLine={first ? undefined : 'Pick a city to start'}
        priority
        titleAs="h1"
        onFallback={() => photo && setFailedSlug(photo.slug)}
      />

      <Perforation />

      <div className="flex flex-col gap-4 px-4 pt-2 pb-4 lg:px-6 lg:pb-6">
        {stops.length > 0 && (
          <div>
            <StampLine
              label="To"
              value={passTitle(stops, codeOf)}
              editName="Edit destination"
              onEdit={() => goTo(1)}
            />
          </div>
        )}

        <QuestionCard
          step={step}
          stops={stops}
          cities={cities}
          onStops={setStops}
          onNext={() => goTo(Math.min(step + 1, 4) as QuestionStep)}
          onBack={() => goTo(Math.max(step - 1, 1) as QuestionStep)}
          focusSignal={focusSignal}
        />

        {stops.length > 0 && (
          <div className="flex flex-col gap-3">
            {create === 'failed' && (
              <BoardStatusLine
                message="Couldn't create the trip. Your answers are kept."
                onRetry={startPlanning}
              />
            )}
            <button
              type="button"
              onClick={startPlanning}
              aria-disabled={create === 'creating' || undefined}
              className={`h-12 w-full rounded-lg bg-ink font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-transform duration-[160ms] ease-[var(--ease-out)] hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97] ${
                create === 'creating' ? 'cursor-progress opacity-40' : ''
              }`}
            >
              Start planning
            </button>
          </div>
        )}

        {photo && showCredit && <PhotoCredit photo={photo} />}
      </div>
    </section>
  )
}

/** Dashed perforation with two notches in the page colour (UI-SPEC §3). */
function Perforation() {
  return (
    <div aria-hidden="true" className="relative h-0">
      <span className="absolute top-0 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
      <span className="absolute inset-x-4 top-0 border-t-[1.5px] border-dashed border-perf" />
      <span className="absolute top-0 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
    </div>
  )
}
