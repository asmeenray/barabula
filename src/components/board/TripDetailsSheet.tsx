'use client'

// Trip details editor (UI-SPEC §7 items 1–2, D-20): the pass's question card
// for one line (TO, WHEN, WHO or INTO), prefilled from the trip, with Save /
// Cancel. Phone: a Base UI Drawer sheet titled with the question. Laptop: an
// inline panel under the ticket row (never a centred modal). Loaded on first
// use from PlanHeader, so Drawer and the question fields stay out of the plan
// route's first-load JS. Escape and Cancel close it; focus goes back to the
// cell that opened it.

import { useEffect, useId, useRef, useState } from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { QuestionCard, type QuestionLine } from '@/components/pass/QuestionCard'
import type { PassAnswers, PassCity } from '@/lib/pass/types'

export interface TripDetailsSheetProps {
  line: QuestionLine
  answers: PassAnswers
  cities: readonly PassCity[]
  /** 'sheet' on phone (Drawer), 'inline' on laptop. */
  variant: 'sheet' | 'inline'
  /** The changed answers; the caller saves them (with the Undo toast). */
  onSave: (patch: Partial<PassAnswers>) => void
  /** Called once the editor has closed (after the sheet's exit animation). */
  onClose: () => void
  /** Where focus goes when the sheet closes (the opener). */
  returnFocus?: React.RefObject<HTMLElement | null>
}

function Sheet(props: TripDetailsSheetProps) {
  const [open, setOpen] = useState(true)
  const legendId = useId()
  const popupRef = useRef<HTMLDivElement>(null)

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
              ref={popupRef}
              initialFocus={() => popupRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? true}
              finalFocus={props.returnFocus}
              aria-labelledby={legendId}
              className="flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-2xl bg-surface text-ink shadow-[0_-12px_40px_-12px_rgba(10,20,30,.4)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[var(--ease-sheet)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none"
            >
              <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
              <Drawer.Content className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
                <QuestionCard
                  only={props.line}
                  answers={props.answers}
                  cities={props.cities}
                  legendId={legendId}
                  onSave={(patch) => {
                    props.onSave(patch)
                    setOpen(false)
                  }}
                  onCancel={() => setOpen(false)}
                />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  )
}

function Inline(props: TripDetailsSheetProps) {
  const legendId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={legendId}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        e.stopPropagation()
        props.onClose()
      }}
      className="mx-4 my-3 rounded-2xl border border-board-line bg-surface p-4 text-ink motion-safe:animate-[ticket-in_250ms_var(--ease-out)]"
    >
      <QuestionCard
        only={props.line}
        answers={props.answers}
        cities={props.cities}
        legendId={legendId}
        onSave={(patch) => {
          props.onSave(patch)
          props.onClose()
        }}
        onCancel={props.onClose}
      />
    </div>
  )
}

export default function TripDetailsSheet(props: TripDetailsSheetProps) {
  return props.variant === 'sheet' ? <Sheet {...props} /> : <Inline {...props} />
}
