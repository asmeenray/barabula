'use client'

// The pass's question card (UI-SPEC §4, D-10): one question at a time inside a
// Fieldset whose legend is the question, with progress dots, "Question {n} of
// 4", Back, Skip and the accent step button. The step bodies are exported on
// their own so the trip-details sheet (16-17) can reuse a single question.
// Copy (D-05): headings may use the airline voice; buttons stay plain verbs.

import { useEffect, useId, useRef, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Fieldset } from '@base-ui/react/fieldset'
import { NumberField } from '@base-ui/react/number-field'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { MinusIcon, PlusIcon, XIcon } from '@/components/icons'
import { findCity, normalizeCity } from '@/lib/photos/normalize'
import { MAX_PASS_DAYS, rangeProblem } from '@/lib/pass/dates'
import { INTEREST_CHIPS, type Interest } from '@/lib/pass/interests'
import type { PassAnswers, PassCity, PassWhen } from '@/lib/pass/types'

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

// --- shared controls ---------------------------------------------------------

/** Ink-when-selected chip (selected chips are ink, never accent). */
const CHIP =
  'flex min-h-11 items-center rounded-full border-[1.5px] border-field px-4 text-base text-ink transition-[background-color,transform] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] hover:bg-surface-2 data-[pressed]:border-ink data-[pressed]:bg-ink data-[pressed]:text-bg'

const STEP_BUTTON =
  'grid w-12 shrink-0 place-items-center text-ink transition-colors duration-[120ms] hover:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40'

type StepperProps = {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min: number
  max: number
  fewer: string
  more: string
  autoFocus?: boolean
}

/** Base UI NumberField with − / + steppers (UI-SPEC: steppers 1–30 days, adults 1–20, kids 0–20). */
export function Stepper({ label, value, onChange, min, max, fewer, more, autoFocus }: StepperProps) {
  const id = useId()
  return (
    <NumberField.Root id={id} value={value} onValueChange={(v) => onChange(v)} min={min} max={max} className="flex flex-col gap-1">
      <label htmlFor={id} className={`${LABEL} text-muted`}>
        {label}
      </label>
      <NumberField.Group className="flex h-12 w-full max-w-[220px] overflow-hidden rounded-lg border-[1.5px] border-field bg-surface-2 focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_40%,transparent)]">
        <NumberField.Decrement aria-label={fewer} className={STEP_BUTTON}>
          <MinusIcon />
        </NumberField.Decrement>
        <NumberField.Input
          data-autofocus={autoFocus || undefined}
          className="min-w-0 flex-1 bg-transparent text-center font-mono text-base font-semibold tabular-nums text-ink outline-none focus-visible:outline-none"
        />
        <NumberField.Increment aria-label={more} className={STEP_BUTTON}>
          <PlusIcon />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
}

type NavProps = {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  focusSignal?: number
}

// --- 2. When? -------------------------------------------------------------

type WhenMode = 'dates' | 'length' | 'unsure'
const WHEN_MODES: { value: WhenMode; label: string }[] = [
  { value: 'dates', label: 'Pick dates' },
  { value: 'length', label: 'Number of days' },
  { value: 'unsure', label: 'Not sure yet' },
]

export const RANGE_MESSAGE = {
  'end-before-start': 'End date is before the start date.',
  'too-long': 'Trips can be up to 30 days.',
} as const

/** When? draft → the answer, or null while it can't be used yet. */
export function whenFromDraft(mode: WhenMode | null, start: string, end: string, days: number | null): PassWhen | undefined {
  if (mode === 'unsure') return { kind: 'unsure' }
  if (mode === 'length') return days && days >= 1 && days <= MAX_PASS_DAYS ? { kind: 'length', days } : undefined
  if (mode === 'dates') return start && end && !rangeProblem(start, end) ? { kind: 'dates', start, end } : undefined
  return undefined
}

type WhenProps = { value: PassWhen; onChange: (draft: PassWhen | undefined) => void }

/** Exactly Pick dates · Number of days · Not sure yet; never dates and days together (D-13). */
export function WhenField({ value, onChange }: WhenProps) {
  const [mode, setMode] = useState<WhenMode | null>(value?.kind ?? null)
  const [start, setStart] = useState(value?.kind === 'dates' ? value.start : '')
  const [end, setEnd] = useState(value?.kind === 'dates' ? value.end : '')
  const [days, setDays] = useState<number | null>(value?.kind === 'length' ? value.days : 3)
  const problem = mode === 'dates' && start && end ? rangeProblem(start, end) : null
  const messageId = useId()
  const startId = useId()
  const endId = useId()

  function update(next: { mode?: WhenMode | null; start?: string; end?: string; days?: number | null }) {
    const m = next.mode !== undefined ? next.mode : mode
    const s = next.start ?? start
    const e = next.end ?? end
    const d = next.days !== undefined ? next.days : days
    if (next.mode !== undefined) setMode(m)
    if (next.start !== undefined) setStart(s)
    if (next.end !== undefined) setEnd(e)
    if (next.days !== undefined) setDays(d)
    onChange(whenFromDraft(m, s, e, d))
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        value={mode ? [mode] : []}
        onValueChange={(v) => update({ mode: (v[0] as WhenMode | undefined) ?? null })}
        className="flex flex-wrap gap-2"
      >
        {WHEN_MODES.map((m, i) => (
          <Toggle
            key={m.value}
            value={m.value}
            // Focus lands on the chosen option (the roving tab stop), else the first.
            data-autofocus={(mode ? m.value === mode : i === 0) || undefined}
            className={CHIP}
          >
            {m.label}
          </Toggle>
        ))}
      </ToggleGroup>

      {mode === 'dates' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={startId} className={`${LABEL} text-muted`}>
                Start date
              </label>
              <input
                id={startId}
                type="date"
                value={start}
                onChange={(e) => update({ start: e.target.value })}
                className={`${FIELD} font-mono tabular-nums`}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={endId} className={`${LABEL} text-muted`}>
                End date
              </label>
              <input
                id={endId}
                type="date"
                value={end}
                min={start || undefined}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? messageId : undefined}
                onChange={(e) => update({ end: e.target.value })}
                className={`${FIELD} font-mono tabular-nums`}
              />
            </div>
          </div>
          <p id={messageId} aria-live="polite" className="min-h-6 text-base font-semibold text-ink">
            {problem ? RANGE_MESSAGE[problem] : ''}
          </p>
        </div>
      )}

      {mode === 'length' && (
        <Stepper
          label="Days"
          value={days}
          onChange={(d) => update({ days: d })}
          min={1}
          max={MAX_PASS_DAYS}
          fewer="Fewer days"
          more="More days"
        />
      )}
    </div>
  )
}

function WhenStep({ value, onCommit, onBack, onSkip, focusSignal }: NavProps & { value: PassWhen; onCommit: (w: PassWhen) => void }) {
  const [draft, setDraft] = useState<PassWhen | undefined>(value ?? undefined)
  return (
    <QuestionShell
      n={2}
      legend="When?"
      onBack={onBack}
      onSkip={onSkip}
      focusSignal={focusSignal}
      next={{ label: 'Next', name: 'Next question', disabled: draft === undefined, onPress: () => draft !== undefined && onCommit(draft) }}
    >
      <WhenField value={value} onChange={setDraft} />
    </QuestionShell>
  )
}

// --- 3. Who's going? -------------------------------------------------------

type Who = { adults: number | null; kids: number | null }

export function WhoField({ value, onChange }: { value: Who; onChange: (who: Who) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
      <Stepper
        label="Adults"
        value={value.adults}
        onChange={(adults) => onChange({ ...value, adults })}
        min={1}
        max={20}
        fewer="Fewer adults"
        more="More adults"
        autoFocus
      />
      <Stepper
        label="Kids"
        value={value.kids}
        onChange={(kids) => onChange({ ...value, kids })}
        min={0}
        max={20}
        fewer="Fewer kids"
        more="More kids"
      />
    </div>
  )
}

function WhoStep({ value, onCommit, onBack, onSkip, focusSignal }: NavProps & { value: Who; onCommit: (w: Who) => void }) {
  const [draft, setDraft] = useState<Who>({ adults: value.adults ?? 1, kids: value.kids ?? 0 })
  const ok = draft.adults !== null && draft.adults >= 1
  return (
    <QuestionShell
      n={3}
      legend="Who's going?"
      onBack={onBack}
      onSkip={onSkip}
      focusSignal={focusSignal}
      next={{ label: 'Next', name: 'Next question', disabled: !ok, onPress: () => onCommit({ adults: draft.adults, kids: draft.kids ?? 0 }) }}
    >
      <WhoField value={draft} onChange={setDraft} />
    </QuestionShell>
  )
}

// --- 4. What are you into? ------------------------------------------------

type Into = { interests: Interest[]; note: string | null }

export function IntoField({ value, onChange }: { value: Into; onChange: (into: Into) => void }) {
  const noteId = useId()
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        multiple
        aria-label="Interests"
        value={value.interests}
        onValueChange={(v) =>
          // Keep the chip list's order, whatever order they were tapped in.
          onChange({ ...value, interests: INTEREST_CHIPS.filter((c) => v.includes(c)) })
        }
        className="flex flex-wrap gap-2"
      >
        {INTEREST_CHIPS.map((chip, i) => (
          <Toggle key={chip} value={chip} data-autofocus={i === 0 || undefined} className={CHIP}>
            {chip}
          </Toggle>
        ))}
      </ToggleGroup>
      <div>
        <label htmlFor={noteId} className="sr-only">
          Anything else?
        </label>
        <input
          id={noteId}
          type="text"
          value={value.note ?? ''}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="Anything else? e.g. no early starts"
          autoComplete="off"
          className={FIELD}
        />
      </div>
    </div>
  )
}

function IntoStep({ value, onCommit, onBack, onSkip, focusSignal }: NavProps & { value: Into; onCommit: (i: Into) => void }) {
  const [draft, setDraft] = useState<Into>(value)
  return (
    <QuestionShell
      n={4}
      legend="What are you into?"
      tag="Optional"
      onBack={onBack}
      onSkip={onSkip}
      focusSignal={focusSignal}
      next={{
        label: 'Done',
        name: 'Finish questions',
        onPress: () => onCommit({ interests: draft.interests, note: draft.note?.trim() ? draft.note.trim() : null }),
      }}
    >
      <IntoField value={draft} onChange={setDraft} />
    </QuestionShell>
  )
}

// --- the card --------------------------------------------------------------

export type QuestionStep = 1 | 2 | 3 | 4

type CardProps = {
  step: QuestionStep
  answers: PassAnswers
  cities: readonly PassCity[]
  onStops: (stops: string[]) => void
  /** Saves an answer (null / empty when skipped) and moves on. */
  onAnswer: (patch: Partial<PassAnswers>) => void
  onNext: () => void
  onBack: () => void
  focusSignal: number
}

/** One question at a time (D-10): Where to? → When? → Who's going? → What are you into? */
export function QuestionCard({ step, answers, cities, onStops, onAnswer, onNext, onBack, focusSignal }: CardProps) {
  const nav = { onBack, onNext, focusSignal }
  switch (step) {
    case 1:
      return (
        <QuestionShell
          key={1}
          n={1}
          legend="Where to?"
          focusSignal={focusSignal}
          next={{ label: 'Next', name: 'Next question', disabled: answers.stops.length === 0, onPress: onNext }}
        >
          <WhereToField stops={answers.stops} cities={cities} onStops={onStops} />
        </QuestionShell>
      )
    case 2:
      return <WhenStep key={2} {...nav} value={answers.when} onSkip={() => onAnswer({ when: null })} onCommit={(when) => onAnswer({ when })} />
    case 3:
      return (
        <WhoStep
          key={3}
          {...nav}
          value={{ adults: answers.adults, kids: answers.kids }}
          onSkip={() => onAnswer({ adults: null, kids: null })}
          onCommit={(who) => onAnswer(who)}
        />
      )
    case 4:
      return (
        <IntoStep
          key={4}
          {...nav}
          value={{ interests: answers.interests, note: answers.note }}
          onSkip={() => onAnswer({ interests: [], note: null })}
          onCommit={(into) => onAnswer(into)}
        />
      )
  }
}
