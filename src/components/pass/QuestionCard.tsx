'use client'

// The pass's question card (UI-SPEC §4, D-10): one question at a time inside a
// Fieldset whose legend is the question, with progress dots, "Question {n} of
// 4", Back, Skip and the accent step button. The step bodies are exported on
// their own so the trip-details sheet (16-17) can reuse a single question.
// Copy (D-05): headings may use the airline voice; buttons stay plain verbs.

import { useEffect, useId, useRef, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Fieldset } from '@base-ui/react/fieldset'
import { XIcon, PlusIcon } from '@/components/icons'
import { findCity, normalizeCity } from '@/lib/photos/normalize'
import type { PassCity } from '@/lib/pass/types'

export const QUESTION_COUNT = 4
export const MAX_STOPS = 10
const MAX_STOP_LENGTH = 80

// --- shared pieces ---------------------------------------------------------

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] uppercase'
export const FIELD =
  'h-12 w-full rounded-lg border-[1.5px] border-field bg-surface-2 px-3 text-base text-ink placeholder:text-muted outline-none focus-visible:border-ink focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_40%,transparent)] focus-visible:outline-none'
const TEXT_BUTTON = 'min-h-11 px-1 font-semibold text-ink underline underline-offset-[3px]'

function ProgressDots({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {Array.from({ length: QUESTION_COUNT }, (_, i) => (
        <span
          key={i}
          className={`h-1 w-4 rounded-full ${i + 1 < n ? 'bg-ink' : i + 1 === n ? 'bg-accent' : 'bg-line'}`}
        />
      ))}
    </span>
  )
}

type ShellProps = {
  n: number
  legend: string
  /** e.g. "Optional" on the last question. */
  tag?: string
  onBack?: () => void
  onSkip?: () => void
  next: { label: string; name: string; disabled?: boolean; onPress: () => void }
  /** Changes when the user navigates here; focus then moves into the question. */
  focusSignal?: number
  children: React.ReactNode
}

/** Fieldset + header (dots, "Question {n} of 4", Back) + body + actions (Skip, step button). */
export function QuestionShell({ n, legend, tag, onBack, onSkip, next, focusSignal = 0, children }: ShellProps) {
  const ref = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (!focusSignal) return
    const root = ref.current
    const target =
      root?.querySelector<HTMLElement>('[data-autofocus]') ??
      root?.querySelector<HTMLElement>('input, button:not([aria-label="Previous question"]), [tabindex="0"]')
    target?.focus()
  }, [focusSignal])

  return (
    <Fieldset.Root ref={ref} className="m-0 min-w-0 border-0 p-0" data-question={n}>
      <div className="flex min-h-11 items-center gap-3">
        <ProgressDots n={n} />
        <span className={`${LABEL} text-muted`}>
          Question {n} of {QUESTION_COUNT}
        </span>
        {onBack && (
          <button type="button" aria-label="Previous question" onClick={onBack} className={`${TEXT_BUTTON} ml-auto`}>
            Back
          </button>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <Fieldset.Legend className="font-read text-[22px] leading-[1.2] font-semibold text-ink">{legend}</Fieldset.Legend>
        {tag && (
          <span className={`${LABEL} rounded-[4px] border border-field px-1.5 py-0.5 text-muted`}>{tag}</span>
        )}
      </div>

      <div className="mt-4">{children}</div>

      <div className="mt-4 flex items-center gap-3">
        {onSkip && (
          <button type="button" aria-label="Skip this question" onClick={onSkip} className={TEXT_BUTTON}>
            Skip
          </button>
        )}
        <button
          type="button"
          aria-label={next.name}
          aria-disabled={next.disabled || undefined}
          onClick={next.disabled ? undefined : next.onPress}
          className={`ml-auto h-11 rounded-lg bg-accent px-5 font-label text-base font-semibold tracking-[0.08em] text-on-accent uppercase transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] ${
            next.disabled ? 'cursor-not-allowed opacity-40 active:scale-100' : 'hover:bg-[color-mix(in_oklab,var(--accent)_88%,#000)]'
          }`}
        >
          {next.label}
        </button>
      </div>
    </Fieldset.Root>
  )
}

// --- 1. Where to? ----------------------------------------------------------

type CityOption = { label: string; city: string; create?: boolean }

export function cityOptions(cities: readonly PassCity[], query: string): CityOption[] {
  const typed = query.trim().slice(0, MAX_STOP_LENGTH)
  const key = normalizeCity(typed)
  const matches = cities
    .filter((c) => !key || normalizeCity(c.name).includes(key) || c.names.some((n) => n.includes(key)))
    .map((c): CityOption => ({ label: c.name, city: c.name }))
  const exact = key && findCity(cities, typed)
  if (typed && !exact) matches.push({ label: `Use “${typed}”`, city: typed, create: true })
  return matches
}

type WhereToProps = {
  stops: string[]
  cities: readonly PassCity[]
  onStops: (stops: string[]) => void
}

/** City only (D-15): curated cities first, else "Use “{typed}”"; stops in order (D-12). */
export function WhereToField({ stops, cities, onStops }: WhereToProps) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const legendId = useId()
  const showInput = stops.length === 0 || adding
  const items = cityOptions(cities, query)

  // Opening another stop row moves focus into it.
  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function choose(option: CityOption | null) {
    if (!option) return
    const city = option.city.trim()
    setQuery('')
    if (!city) return
    if (stops.at(-1)?.toLowerCase() !== city.toLowerCase() && stops.length < MAX_STOPS) onStops([...stops, city])
    setAdding(false)
  }

  function remove(i: number) {
    const next = stops.filter((_, j) => j !== i)
    onStops(next)
    // Keep focus on the pass: the next token's remove, else the field.
    requestAnimationFrame(() => (next.length ? addRef.current : inputRef.current)?.focus())
  }

  return (
    <div className="flex flex-col gap-3">
      {stops.length > 0 && (
        <ol aria-label="Stops" className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {stops.map((city, i) => (
            <li key={`${i}-${city}`} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="px-1 font-mono text-xs text-muted">
                  →
                </span>
              )}
              <span className="flex h-8 items-center gap-1 rounded-[4px] bg-ink pr-0 pl-2 font-mono text-xs font-semibold tracking-[0.04em] text-bg uppercase">
                {city}
                <button
                  type="button"
                  aria-label={`Remove ${city}`}
                  onClick={() => remove(i)}
                  className="relative grid h-8 w-8 place-items-center rounded-[4px] after:absolute after:-inset-1.5 after:content-[''] hover:bg-[color-mix(in_oklab,var(--bg)_18%,transparent)]"
                >
                  <XIcon size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {showInput ? (
        <Combobox.Root
          items={items}
          filteredItems={items}
          value={null}
          onValueChange={(v) => choose(v as CityOption | null)}
          inputValue={query}
          onInputValueChange={(v) => setQuery(v)}
          itemToStringLabel={(o: CityOption) => o.label}
          autoHighlight
        >
          <span id={legendId} className="sr-only">
            {stops.length ? 'Next stop' : 'City'}
          </span>
          <Combobox.Input
            ref={inputRef}
            id="pass-where-to"
            data-autofocus
            aria-labelledby={legendId}
            placeholder="A city"
            maxLength={MAX_STOP_LENGTH}
            autoComplete="off"
            className={FIELD}
          />
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4} className="z-30 outline-none">
              <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-lg border-[1.5px] border-field bg-surface py-1 text-ink shadow-[0_12px_32px_-12px_rgba(10,20,30,.35)] data-[empty]:hidden">
                <Combobox.List>
                  {(o: CityOption) => (
                    <Combobox.Item
                      key={`${o.create ? 'use' : 'city'}:${o.city}`}
                      value={o}
                      className="flex min-h-11 cursor-default items-center px-3 text-base outline-none select-none data-[highlighted]:bg-surface-2"
                    >
                      {o.create ? o.label : <span className="font-semibold">{o.label}</span>}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ) : (
        stops.length < MAX_STOPS && (
          <button
            ref={addRef}
            type="button"
            data-autofocus
            onClick={() => setAdding(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-field font-label text-base font-semibold tracking-[0.08em] text-ink uppercase transition-colors duration-[120ms] hover:bg-surface-2"
          >
            <PlusIcon />
            Add a stop
          </button>
        )
      )}
    </div>
  )
}

// --- the card --------------------------------------------------------------

export type QuestionStep = 1 | 2 | 3 | 4

type CardProps = {
  step: QuestionStep
  stops: string[]
  cities: readonly PassCity[]
  onStops: (stops: string[]) => void
  onNext: () => void
  onBack: () => void
  focusSignal: number
}

export function QuestionCard({ step, stops, cities, onStops, onNext, focusSignal }: CardProps) {
  if (step !== 1) return null
  return (
    <QuestionShell
      key={1}
      n={1}
      legend="Where to?"
      focusSignal={focusSignal}
      next={{ label: 'Next', name: 'Next question', disabled: stops.length === 0, onPress: onNext }}
    >
      <WhereToField stops={stops} cities={cities} onStops={onStops} />
    </QuestionShell>
  )
}
