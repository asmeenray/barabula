'use client'

// Add / Edit place form (UI-SPEC §9 "Add / Edit place", D-18). Phone: a Base
// UI Drawer sheet (modal, top corners 16). Laptop: an inline form in the list,
// where the Add place bar was or under the row being edited; never a centred
// modal. Loaded on first use (AddPlaceButton's LazyPlaceForm), so Drawer,
// Select, Switch and Field stay out of the plan route's first-load JS (Q46).
// Escape, "Don't add" and "Discard changes" close it; the caller puts focus
// back on the opener.

import { useEffect, useId, useRef, useState } from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { Field } from '@base-ui/react/field'
import { Select } from '@base-ui/react/select'
import { Switch } from '@base-ui/react/switch'
import { useCanEdit } from '@/lib/client/use-online'
import { CheckIcon, ChevronDownIcon } from '@/components/icons'

export type PlaceFormMode = 'add' | 'edit'

export interface PlaceFormValues {
  name: string
  /** null = Maybe. */
  day: number | null
  location: string
  /** The "Set time (booking or ticket)" switch (D-25 fixed anchor). */
  fixedTime: boolean
  time: string
  note: string
}

export interface PlaceFormProps {
  mode: PlaceFormMode
  /** 'sheet' on phone (Drawer), 'inline' on laptop. */
  variant: 'sheet' | 'inline'
  /** Day 1…n in the Day select, plus Maybe. */
  dayCount: number
  initial: PlaceFormValues
  /** Called with valid values; the form then closes. */
  onSubmit: (values: PlaceFormValues) => void
  /** Called once the form has closed (after the sheet's exit animation). */
  onClose: () => void
  /** Where focus goes when the sheet closes (the opener). */
  returnFocus?: React.RefObject<HTMLElement | null>
}

const NAME_REQUIRED = 'Add a place name.'

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase'
const OPTIONAL = 'font-read font-normal tracking-normal normal-case'
const FIELD =
  'h-12 w-full rounded-lg border-[1.5px] border-field bg-surface-2 px-3 text-base text-ink placeholder:text-muted outline-none focus-visible:border-ink focus-visible:outline-none data-invalid:border-danger'
const PRIMARY =
  'inline-flex h-12 items-center justify-center rounded-lg bg-ink px-5 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97]'
const PRIMARY_DISABLED =
  'inline-flex h-12 items-center justify-center rounded-lg bg-ink px-5 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase cursor-not-allowed opacity-40'
const TEXT_BUTTON =
  'inline-flex min-h-11 items-center px-1 text-base font-semibold text-ink underline underline-offset-[3px]'

const TITLES: Record<PlaceFormMode, string> = { add: 'Add a place', edit: 'Edit place' }
const SUBMIT: Record<PlaceFormMode, string> = { add: 'Add place', edit: 'Save place' }
const DISMISS: Record<PlaceFormMode, string> = { add: "Don't add", edit: 'Discard changes' }

function dayValue(day: number | null): string {
  return day === null ? 'maybe' : String(day)
}

function FormBody({
  mode,
  dayCount,
  initial,
  onSubmit,
  onDismiss,
  titleId,
  nameRef,
  footerClassName = '',
}: {
  mode: PlaceFormMode
  dayCount: number
  initial: PlaceFormValues
  onSubmit: (values: PlaceFormValues) => void
  onDismiss: () => void
  titleId: string
  nameRef: React.RefObject<HTMLInputElement | null>
  footerClassName?: string
}) {
  const canEdit = useCanEdit()
  const [values, setValues] = useState<PlaceFormValues>(initial)
  const [showError, setShowError] = useState(false)
  const ids = { location: useId(), time: useId(), note: useId(), fixed: useId() }

  // Day 1…n and Maybe; a place on a day past the board's count keeps its day.
  const total = Math.max(1, dayCount, initial.day ?? 0)
  const dayItems = [
    ...Array.from({ length: total }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` })),
    { value: 'maybe', label: 'Maybe' },
  ]

  function set<K extends keyof PlaceFormValues>(key: K, value: PlaceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    if (values.name.trim() === '') {
      setShowError(true)
      nameRef.current?.focus()
      return
    }
    onSubmit(values)
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-4">
        <Field.Root invalid={showError && values.name.trim() === ''} className="flex flex-col gap-1">
          <Field.Label className={LABEL}>Place name</Field.Label>
          <Field.Control
            ref={nameRef}
            required
            autoComplete="off"
            value={values.name}
            onValueChange={(v) => {
              set('name', v)
              if (v.trim() !== '') setShowError(false)
            }}
            className={FIELD}
          />
          <Field.Error match={showError && values.name.trim() === ''} className="text-base font-semibold text-danger">
            {NAME_REQUIRED}
          </Field.Error>
        </Field.Root>

        <Select.Root
          items={dayItems}
          value={dayValue(values.day)}
          onValueChange={(v) => {
            if (typeof v === 'string') set('day', v === 'maybe' ? null : Number(v))
          }}
          modal={false}
        >
          <div className="flex flex-col gap-1">
            <Select.Label className={LABEL}>Day</Select.Label>
            <Select.Trigger className={`${FIELD} flex items-center justify-between gap-3 text-left`}>
              <Select.Value className="font-mono font-semibold tabular-nums" />
              <Select.Icon className="text-muted">
                <ChevronDownIcon size={18} />
              </Select.Icon>
            </Select.Trigger>
          </div>
          <Select.Portal>
            <Select.Positioner
              className="z-[60] outline-none"
              alignItemWithTrigger={false}
              sideOffset={4}
              collisionPadding={16}
            >
              <Select.Popup className="max-h-[min(320px,var(--available-height))] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface py-1 text-ink shadow-[0_8px_24px_rgb(11_16_20/0.16)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
                <Select.List>
                  {dayItems.map((item) => (
                    <Select.Item
                      key={item.value}
                      value={item.value}
                      className="grid min-h-11 cursor-default grid-cols-[20px_1fr] items-center gap-2 px-3 text-base outline-none select-none data-highlighted:bg-surface-2"
                    >
                      <Select.ItemIndicator className="col-start-1">
                        <CheckIcon size={16} />
                      </Select.ItemIndicator>
                      <Select.ItemText className="col-start-2">{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.location} className={LABEL}>
            Address or area<span className={OPTIONAL}> (optional)</span>
          </label>
          <input
            id={ids.location}
            autoComplete="off"
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor={ids.fixed} className="flex min-h-11 items-center justify-between gap-4">
            <span className="text-base text-ink">Set time (booking or ticket)</span>
            <Switch.Root
              id={ids.fixed}
              checked={values.fixedTime}
              onCheckedChange={(checked) => set('fixedTime', checked)}
              className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-[1.5px] border-field bg-surface-2 p-0.5 transition-colors duration-150 ease-out data-checked:border-ink data-checked:bg-ink"
            >
              <Switch.Thumb className="size-5 rounded-full bg-ink transition-[translate,background-color] duration-150 ease-out data-checked:translate-x-5 data-checked:bg-bg motion-reduce:transition-none" />
            </Switch.Root>
          </label>
          {values.fixedTime && (
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.time} className={LABEL}>
                Time
              </label>
              <input
                id={ids.time}
                type="time"
                value={values.time}
                onChange={(e) => set('time', e.target.value)}
                className={`${FIELD} max-w-[200px] font-mono tabular-nums`}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.note} className={LABEL}>
            Note<span className={OPTIONAL}> (optional)</span>
          </label>
          <textarea
            id={ids.note}
            rows={3}
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
            className={`${FIELD} h-auto min-h-24 resize-y py-2.5 leading-normal`}
          />
        </div>
      </div>

      <div className={`mt-6 flex items-center justify-end gap-4 ${footerClassName}`}>
        <button type="button" onClick={onDismiss} className={TEXT_BUTTON}>
          {DISMISS[mode]}
        </button>
        <button
          type="submit"
          aria-disabled={!canEdit || undefined}
          className={`${canEdit ? PRIMARY : PRIMARY_DISABLED} min-w-40`}
        >
          {SUBMIT[mode]}
        </button>
      </div>
    </form>
  )
}

function SheetForm(props: PlaceFormProps) {
  const [open, setOpen] = useState(true)
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setOpen(false)
      }}
      onOpenChangeComplete={(next) => {
        if (!next) props.onClose()
      }}
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 min-h-dvh bg-[rgb(5_8_12/0.4)] opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[400ms] ease-[var(--ease-sheet)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
            <Drawer.Popup
              initialFocus={nameRef}
              finalFocus={props.returnFocus}
              aria-labelledby={titleId}
              className="flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-2xl bg-surface text-ink shadow-[0_-12px_40px_-12px_rgba(10,20,30,.4)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[var(--ease-sheet)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none"
            >
              <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
              <Drawer.Content className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
                <Drawer.Title id={titleId} className="mb-4 font-read text-[22px] leading-[1.2] font-semibold">
                  {TITLES[props.mode]}
                </Drawer.Title>
                <FormBody
                  mode={props.mode}
                  dayCount={props.dayCount}
                  initial={props.initial}
                  titleId={titleId}
                  nameRef={nameRef}
                  onSubmit={(values) => {
                    props.onSubmit(values)
                    setOpen(false)
                  }}
                  onDismiss={() => setOpen(false)}
                />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  )
}

function InlineForm(props: PlaceFormProps) {
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
    nameRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        e.stopPropagation()
        props.onClose()
      }}
      className="mx-4 my-3 rounded-2xl border border-board-line bg-surface p-4 text-ink motion-safe:animate-[ticket-in_250ms_var(--ease-out)]"
    >
      <h3 id={titleId} className="mb-4 font-read text-[22px] leading-[1.2] font-semibold">
        {TITLES[props.mode]}
      </h3>
      <FormBody
        mode={props.mode}
        dayCount={props.dayCount}
        initial={props.initial}
        titleId={titleId}
        nameRef={nameRef}
        onSubmit={(values) => {
          props.onSubmit(values)
          props.onClose()
        }}
        onDismiss={props.onClose}
      />
    </div>
  )
}

export default function PlaceForm(props: PlaceFormProps) {
  return props.variant === 'sheet' ? <SheetForm {...props} /> : <InlineForm {...props} />
}
