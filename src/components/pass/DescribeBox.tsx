'use client'

// Describe mode on the blank pass (UI-SPEC §4, D-11, D-16): one sentence about
// the whole trip, a live preview of what was read (TO / WHEN / WHO / INTO,
// missing parts "we'll ask"), and "Use this", which fills the same pass
// answers. Phase 16 reading is plain keywords (readDescription), no AI. With
// no city read, TO shows "ANYWHERE?" and either up to 4 "Cities that fit"
// (curated cities with verified tags only) or "Name a city and we'll fill in
// the rest." Text renders as React text only (T-16-38). No length limit; the
// box grows from 3 to 6 rows, then scrolls.

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CityPhoto } from '@/lib/photos/manifest'
import type { KnownCity } from '@/lib/pass/cities'
import { readDescription, readingToAnswers } from '@/lib/pass/describe'
import { citiesThatFit } from '@/lib/pass/fit'
import { intoLine, passTitle, whenLine, whoLine } from '@/lib/pass/format'
import type { PassAnswers } from '@/lib/pass/types'
import { LABEL, TEXT_BUTTON, stepButtonClass } from './QuestionCard'

export const EXAMPLE_PROMPTS = [
  'A long weekend in Lisbon for food and views',
  'A family week in Rome with 2 kids',
  'Paris then Prague, 6 days, museums and architecture',
  'Kyoto in April with my partner, slow pace',
] as const

/** TO with no city read (UI-SPEC copy). Screen readers read it as the word. */
const ANYWHERE = 'ANYWHERE?'

/** 1.5 px border on each side; the box is border-box, scrollHeight excludes the border. */
const BORDER_PX = 3

type Props = {
  text: string
  onText: (text: string) => void
  /** Curated cities first, then the hand-written list (knownCities). */
  cities: readonly KnownCity[]
  /** The curated set; only entries with sourced tags can be suggested. */
  photos: readonly CityPhoto[]
  /** The user's day (YYYY-MM-DD) for placing "12–15 May"; null reads a range as its month. */
  today: string | null
  onUse: (answers: Pick<PassAnswers, 'stops' | 'when' | 'adults' | 'kids' | 'interests'>) => void
  onStepByStep: () => void
}

export function DescribeBox({ text, onText, cities, photos, today, onUse, onStepByStep }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  // Long pastes stay responsive: the preview reads a deferred copy of the text.
  const deferred = useDeferredValue(text)
  const reading = useMemo(() => readDescription(deferred, cities, today), [deferred, cities, today])
  const fits = useMemo(() => (reading.noCity ? citiesThatFit(reading, photos) : []), [reading, photos])
  const hasText = deferred.trim().length > 0
  const chosenCity = reading.noCity && chosen && fits.some((p) => p.city === chosen) ? chosen : null
  const canUse = !reading.noCity || !!chosenCity

  // Arriving in describe mode puts the caret in the box.
  useEffect(() => {
    areaRef.current?.focus()
  }, [])

  // Grow with the text from 3 rows up to the CSS max (6 rows), then scroll.
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + BORDER_PX}px`
  }, [text])

  function change(next: string) {
    onText(next)
    setChosen(null)
  }

  const to = reading.stops.length
    ? passTitle(reading.stops)
    : chosenCity
      ? chosenCity
      : hasText
        ? ANYWHERE
        : null

  return (
    <div className="flex flex-col gap-4" data-describe>
      <div className="flex min-h-11 items-center gap-3">
        <label htmlFor="pass-describe" className="font-read text-[22px] leading-[1.2] font-semibold text-ink">
          Describe your whole trip
        </label>
        <button type="button" onClick={onStepByStep} className={`${TEXT_BUTTON} ml-auto shrink-0`}>
          Step by step instead
        </button>
      </div>

      <textarea
        ref={areaRef}
        id="pass-describe"
        rows={3}
        value={text}
        onChange={(e) => change(e.target.value)}
        placeholder="Where, when, who's coming, what you love…"
        autoComplete="off"
        className="block max-h-[171px] min-h-[99px] w-full resize-none overflow-y-auto rounded-lg border-[1.5px] border-field bg-surface-2 px-3 py-3 text-base leading-6 text-ink outline-none placeholder:text-muted focus-visible:border-ink focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_40%,transparent)] focus-visible:outline-none"
      />

      <div className="flex flex-col gap-2">
        <span className={`${LABEL} text-muted`} id="pass-describe-try">
          Try
        </span>
        <ul aria-labelledby="pass-describe-try" className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li key={prompt} className="max-w-full">
              <button
                type="button"
                onClick={() => change(prompt)}
                className="min-h-11 max-w-full rounded-[22px] border-[1.5px] border-field px-4 py-2 text-left text-base leading-snug text-ink transition-[background-color,transform] duration-[120ms] ease-[var(--ease-out)] hover:bg-surface-2 active:scale-[0.97]"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div role="group" aria-label="Preview">
        <dl className="m-0 border-t-[1.5px] border-dashed border-perf">
          <PreviewLine label="To" value={to} />
          <PreviewLine label="When" value={whenLine(reading.when)} />
          <PreviewLine label="Who" value={whoLine(reading.adults, reading.kids)} />
          <PreviewLine label="Into" value={intoLine(reading.interests, null)} />
        </dl>
      </div>

      {hasText && reading.noCity &&
        (fits.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className={`${LABEL} text-muted`} id="pass-describe-fit">
              Cities that fit
            </span>
            <ul aria-labelledby="pass-describe-fit" className="flex flex-wrap gap-2">
              {fits.map((p) => {
                const on = chosenCity === p.city
                return (
                  <li key={p.slug}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setChosen(on ? null : p.city)}
                      className={`flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-base transition-[background-color,transform] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] ${
                        on ? 'border-ink bg-ink text-bg' : 'border-field text-ink hover:bg-surface-2'
                      }`}
                    >
                      {p.city}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="text-base text-muted">Name a city and we&apos;ll fill in the rest.</p>
        ))}

      <div className="flex">
        <button
          type="button"
          aria-label="Use this trip description"
          aria-disabled={!canUse || undefined}
          onClick={canUse ? () => onUse(readingToAnswers(reading, chosenCity)) : undefined}
          className={stepButtonClass(!canUse)}
        >
          Use this
        </button>
      </div>
    </div>
  )
}

/** A stamp line of the preview: Label + one-line Mono value with ellipsis, or "we'll ask". */
function PreviewLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid min-h-11 grid-cols-[56px_1fr] items-center gap-2 border-b-[1.5px] border-dashed border-perf">
      <dt className={`${LABEL} text-muted`}>{label}</dt>
      <dd className="m-0 min-w-0">
        {value ? (
          <span className="block truncate font-mono text-base leading-tight font-semibold text-ink uppercase tabular-nums" title={value}>
            {value}
          </span>
        ) : (
          <span className="font-read text-base text-muted">we&apos;ll ask</span>
        )}
      </dd>
    </div>
  )
}
