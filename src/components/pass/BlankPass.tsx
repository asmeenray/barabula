'use client'

// The blank "next trip" pass, the home page's hero (UI-SPEC §4, D-09…D-18).
// Cover: the random curated city the server picked (D-09), then the first
// stop's photo or its city-map cover once a city is set. Body: the printed
// stamp lines, the one-question-at-a-time card and, as soon as one city is
// set, Start planning (D-10), which creates the trip and opens its empty plan
// (D-18). No From field and no flights link (D-14). Logged out, Start planning
// keeps the answers on the device and asks the user to sign in (D-19, D-41);
// back here without signing in, the kept answers are shown again.

import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { CityPhoto } from '@/lib/photos/manifest'
import { findCity } from '@/lib/photos/normalize'
import { knownCities } from '@/lib/pass/cities'
import { firstMissingStep } from '@/lib/pass/describe'
import { intoLine, passTitle, whenLine, whoLine } from '@/lib/pass/format'
import type { PassAnswers, PassCity } from '@/lib/pass/types'
import { loadPending, savePending } from '@/lib/pass/pending'
import { TILE_ROW_PX, tileRows } from '@/lib/pass/tiles'
import { LAPTOP_QUERY, useMediaQuery } from '@/lib/client/use-media'
import { vibrate } from '@/lib/client/haptics'
import { markTripOpen, TRIP_OPEN } from '@/lib/client/trip-open'
import { useMotionFeatures } from '@/components/motion/MotionProvider'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { PassCover, PhotoCredit } from './PassCover'
import { DescribeBox } from './DescribeBox'
import { QuestionCard, type QuestionStep } from './QuestionCard'
import { StampLine } from './StampLine'
import { CoverNote } from './CoverNote'

const noopSubscribe = () => () => {}

/** The laptop plane cursor (D-31): its chunk loads only where it is shown. */
const PlaneCursor = dynamic(() => import('@/components/motion/PlaneCursor'), { ssr: false })
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** The sign-in sheet / panel (Drawer), loaded the first time a logged-out user starts planning. */
const SignInPanel = lazy(() => import('./SignInPanel'))

type Props = {
  /** The server's random curated city (getHomeData), shown until a city is chosen. */
  coverPhoto: CityPhoto
  /** The curated set: offered first in "Where to?" and used for the chosen city's cover. */
  photos: readonly CityPhoto[]
  signedIn: boolean
  /**
   * Laptop shape. horizontal: photo left 55%, body right 45%, min-height 440
   * (no Now/Next pass beside it). vertical: a column beside a Now/Next pass,
   * cover 280 (16-12). Phone is always vertical.
   */
  layout?: 'horizontal' | 'vertical'
  /** The top pass on the page gets the eager, high-priority photo; false when a Now pass sits above. */
  priority?: boolean
  /** The user's day (YYYY-MM-DD, getHomeData) for reading "12–15 May" in describe mode. */
  today?: string | null
  /**
   * "On the cover" caption of coverPhoto (getHomeData, server-only list), or
   * null. The laptop horizontal pass shows it with a "Plan a trip to {City}"
   * shortcut until the first input (quick 261007-wms).
   */
  coverCaption?: string | null
}

const EMPTY: PassAnswers = { stops: [], when: null, adults: null, kids: null, interests: [], note: null }

type CreateState = 'idle' | 'creating' | 'failed'

type Answered = Pick<PassAnswers, 'stops' | 'when' | 'adults' | 'kids' | 'interests'>

/** Whether a question still has no answer (a skipped one counts as unanswered). */
function unanswered(step: QuestionStep, a: PassAnswers): boolean {
  if (step === 1) return a.stops.length === 0
  if (step === 2) return a.when === null
  if (step === 3) return a.adults === null
  return a.interests.length === 0 && !a.note?.trim()
}

export function BlankPass({
  coverPhoto,
  photos,
  signedIn,
  layout = 'vertical',
  priority = true,
  today = null,
  coverCaption = null,
}: Props) {
  const horizontal = layout === 'horizontal'
  const router = useRouter()
  const announce = useAnnounce()
  const [answers, setAnswers] = useState<PassAnswers>(EMPTY)
  const [step, setStep] = useState<QuestionStep | 'ready'>(1)
  // Once the last question has been answered, Next after an Edit goes back to the ready pass.
  const [reachedEnd, setReachedEnd] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  // Describe mode (D-11) replaces the question card; the text is kept when switching back.
  const [mode, setMode] = useState<'steps' | 'describe'>('steps')
  const [description, setDescription] = useState('')
  // After "Use this", Next walks only the questions the description left open.
  const [described, setDescribed] = useState(false)
  const readyRef = useRef<HTMLHeadingElement>(null)
  const [create, setCreate] = useState<CreateState>('idle')
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  // Moment 4: once Start planning has made the trip, the cover takes its
  // trip-cover name and morphs into the new plan's header.
  const [tripId, setTripId] = useState<string | null>(null)
  // One id per pass, so a retried create returns the same trip (Pitfall 7).
  const clientRef = useRef<string | null>(null)
  // Logged out (D-19): the sign-in sheet / inline panel, and answers kept from
  // a sign-in that did not finish.
  const isLaptop = useMediaQuery(LAPTOP_QUERY)
  // Plane cursor: a mouse or trackpad, and no reduced motion.
  const finePointer = useMediaQuery(FINE_POINTER_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  // False on the server render, true once hydrated: the title and status line
  // split-flap in on load like an arrival board (Asmeen, 7 Oct 2026), and the
  // title flips again whenever the destination changes.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const passRef = useRef<HTMLElement>(null)
  // Stamp lines rise in with Motion (moment 1): fetch its features now, before the first answer.
  useMotionFeatures()
  const [signIn, setSignIn] = useState(false)
  const [interrupted, setInterrupted] = useState(false)
  const startRef = useRef<HTMLButtonElement>(null)
  const [focusStart, setFocusStart] = useState(0)
  // The "On the cover" note goes for good on the first input, the shortcut or
  // any city being set; it never comes back in this page view.
  const [noteGone, setNoteGone] = useState(false)

  const cities = useMemo<PassCity[]>(
    () => photos.map((p) => ({ name: p.city, names: p.names, code: p.iata })),
    [photos]
  )
  const codeOf = (stop: string) => findCity(cities, stop)?.code
  const readable = useMemo(() => knownCities(cities), [cities])

  const { stops } = answers
  const first = stops[0]
  const photo = first ? findCity(photos, first) : coverPhoto
  const coverCity = first ?? coverPhoto.city
  const title = first ? passTitle(stops, codeOf) : 'Where to next?'
  const code = stops.length === 1 ? codeOf(first) : undefined
  // Laptop flap-tile title (quick 261007-wms, A-1) on every laptop blank pass;
  // a title that needs a third row keeps today's plain title and scrim.
  const tiles = tileRows(title, horizontal ? TILE_ROW_PX.horizontal : TILE_ROW_PX.vertical)
  const showCredit = photo && failedSlug !== photo.slug

  function goTo(next: QuestionStep | 'ready') {
    setStep(next)
    setFocusSignal((n) => n + 1)
  }

  function advance(current: PassAnswers = answers) {
    if (step === 'ready') return
    if (described) {
      const later = ([2, 3, 4] as const).find((s) => s > step && unanswered(s, current))
      if (later) return goTo(later)
      setReachedEnd(true)
      return goTo('ready')
    }
    if (step === 4 || reachedEnd) {
      setReachedEnd(true)
      goTo('ready')
    } else goTo((step + 1) as QuestionStep)
  }

  // Back without signing in: the kept answers fill the pass again (after
  // hydration, since the server has no device storage).
  useEffect(() => {
    if (signedIn) return
    let live = true
    // Device storage only exists after hydration, so this one restore cannot
    // be an initial state without a server/client mismatch. Async: the schema
    // that re-checks the kept answers loads only when something is kept.
    void loadPending().then((kept) => {
      if (!live || !kept) return
      clientRef.current = kept.clientRef
      setAnswers(kept.pass)
      if (kept.pass.stops.length) setNoteGone(true)
      setReachedEnd(true)
      setStep('ready')
      setInterrupted(true)
    })
    return () => {
      live = false
    }
  }, [signedIn])

  // Closing the inline panel brings Start planning back; focus returns to it.
  useEffect(() => {
    if (focusStart) startRef.current?.focus()
  }, [focusStart])

  function closeSignIn() {
    setSignIn(false)
    setFocusStart((n) => n + 1)
  }

  // The ready pass takes focus when the user arrives there, like a new question.
  useEffect(() => {
    if (step === 'ready' && focusSignal) readyRef.current?.focus()
  }, [step, focusSignal])

  function setStops(next: string[]) {
    // Moment 1: a short buzz on a city pick (Android, Haptics on; a no-op elsewhere).
    if (next.some((city) => !stops.includes(city))) vibrate(8)
    setAnswers((a) => ({ ...a, stops: next }))
    if (next.length) {
      setNoteGone(true)
      announce(`To: ${next.join(', then ')}`)
    }
  }

  /** "Plan a trip to {City}": the same path as a combobox pick; focus stays inside Where to?. */
  function planCover() {
    setNoteGone(true)
    setStops([coverPhoto.city])
    setFocusSignal((n) => n + 1)
  }

  /** Saves one answer (a skip saves null / empty, which prints nothing), announces its line, moves on. */
  function answer(patch: Partial<PassAnswers>) {
    const next = { ...answers, ...patch }
    setAnswers(next)
    const line =
      'when' in patch
        ? whenLine(next.when) && `When: ${whenLine(next.when)}`
        : 'adults' in patch
          ? whoLine(next.adults, next.kids) && `Who: ${whoLine(next.adults, next.kids)}`
          : 'interests' in patch
            ? intoLine(next.interests, next.note) && `Into: ${intoLine(next.interests, next.note)}`
            : null
    if (line) announce(line)
    advance(next)
  }

  /** "Use this": the description's answers fill the pass, then the first open question (or the ready pass). */
  function applyDescription(patch: Answered) {
    const next = { ...answers, ...patch }
    setAnswers(next)
    setDescribed(true)
    setMode('steps')
    if (next.stops.length) {
      setNoteGone(true)
      announce(`To: ${next.stops.join(', then ')}`)
    }
    const open = firstMissingStep(next)
    if (open === 'ready') setReachedEnd(true)
    goTo(open)
  }

  function stepByStep() {
    setMode('steps')
    setFocusSignal((n) => n + 1)
  }

  const when = whenLine(answers.when)
  const who = whoLine(answers.adults, answers.kids)
  const into = intoLine(answers.interests, answers.note)

  async function startPlanning() {
    if (create === 'creating') return
    clientRef.current ??= crypto.randomUUID()
    if (!signedIn) {
      // Kept for 24 h; ResumePendingTrip creates the trip right after sign-in.
      savePending(answers, clientRef.current)
      setInterrupted(false)
      setSignIn(true)
      return
    }
    setCreate('creating')
    try {
      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...answers, client_ref: clientRef.current }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const { id } = (await res.json()) as { id: string }
      setTripId(id)
      markTripOpen(id)
      router.push(`/itinerary/${id}`, { transitionTypes: [TRIP_OPEN] })
    } catch {
      setCreate('failed')
    }
  }

  return (
    <section
      ref={passRef}
      // "Fill the pass" (CreateTripTile) scrolls here and focuses Where to?
      id="next-trip-pass"
      aria-label="Next trip"
      data-layout={layout}
      className={`scroll-mt-4 overflow-hidden rounded-2xl bg-surface shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] dark:border dark:border-line dark:shadow-none ${
        horizontal ? 'lg:grid lg:min-h-[440px] lg:grid-cols-[55fr_45fr]' : ''
      }`}
    >
      {/* Not keyed by photo: CoverImage crossfades a new city's photo over the
          old one and the title split-flaps to the city (moment 1, D-30). */}
      <PassCover
        variant="blank"
        photo={photo}
        cityName={coverCity}
        title={title}
        stateLabel="Next trip"
        code={code}
        statusLine={first ? undefined : 'Pick a city to start'}
        priority={priority}
        titleAs="h1"
        flapTitle={hydrated}
        flapBoard
        tiles={tiles}
        transitionId={tripId}
        onFallback={() => photo && setFailedSlug(photo.slug)}
        className={horizontal ? 'lg:h-auto lg:min-h-[440px]' : 'lg:h-70'}
      />

      <div className={horizontal ? 'lg:hidden' : undefined}>
        <Perforation />
      </div>

      <div className="relative flex min-w-0 flex-col gap-4 px-4 pt-2 pb-4 lg:px-6 lg:pt-4 lg:pb-6">
        {horizontal && <SidePerforation />}
        {stops.length > 0 && (
          <div>
            <StampLine label="To" value={passTitle(stops, codeOf)} editName="Edit destination" onEdit={() => goTo(1)} print />
            {when && <StampLine label="When" value={when} editName="Edit dates" onEdit={() => goTo(2)} print />}
            {who && <StampLine label="Who" value={who} editName="Edit travellers" onEdit={() => goTo(3)} print />}
            {into && <StampLine label="Into" value={into} editName="Edit interests" onEdit={() => goTo(4)} print />}
          </div>
        )}

        {signIn && isLaptop ? (
          <Suspense fallback={null}>
            <SignInPanel variant="inline" onClose={closeSignIn} />
          </Suspense>
        ) : mode === 'describe' ? (
          <DescribeBox
            text={description}
            onText={setDescription}
            cities={readable}
            photos={photos}
            today={today}
            onUse={applyDescription}
            onStepByStep={stepByStep}
          />
        ) : step === 'ready' ? (
          <div className="py-2">
            <h2 ref={readyRef} tabIndex={-1} className="font-read text-[22px] leading-[1.2] font-semibold text-ink outline-none">
              Your pass is ready.
            </h2>
            <p className="mt-1 text-base text-muted">Tap any line to change it.</p>
          </div>
        ) : (
          <QuestionCard
            step={step}
            answers={answers}
            cities={cities}
            onStops={setStops}
            onAnswer={answer}
            onNext={() => advance()}
            onDescribe={() => setMode('describe')}
            onBack={() => goTo(Math.max(step - 1, 1) as QuestionStep)}
            focusSignal={focusSignal}
          />
        )}

        {stops.length > 0 && !(signIn && isLaptop) && (
          <div className="flex flex-col gap-3">
            {interrupted && !signIn && (
              <BoardStatusLine
                message="Sign-in didn't finish. Your answers are kept."
                retryLabel="Retry sign-in"
                onRetry={startPlanning}
              />
            )}
            {create === 'failed' && (
              <BoardStatusLine
                message="Couldn't create the trip. Your answers are kept."
                onRetry={startPlanning}
              />
            )}
            <button
              ref={startRef}
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

        {horizontal && !noteGone && stops.length === 0 && step === 1 && mode === 'steps' && !signIn && (
          <CoverNote
            city={coverPhoto.city}
            caption={coverCaption}
            reducedMotion={reducedMotion}
            onPlan={planCover}
            onDismiss={() => setNoteGone(true)}
          />
        )}

        {photo && showCredit && <PhotoCredit photo={photo} />}
      </div>

      {finePointer && !reducedMotion && <PlaneCursor area={passRef} />}

      {/* Phone: sign-in is a bottom sheet over the pass. */}
      {signIn && !isLaptop && (
        <Suspense fallback={null}>
          <SignInPanel variant="sheet" onClose={() => setSignIn(false)} returnFocus={startRef} />
        </Suspense>
      )}
    </section>
  )
}

/** The laptop horizontal pass: the perforation runs down the body's left edge. */
function SidePerforation() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-0 lg:block">
      <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-bg" />
      <span className="absolute inset-y-4 left-0 border-l-[1.5px] border-dashed border-perf" />
      <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-bg" />
    </div>
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
