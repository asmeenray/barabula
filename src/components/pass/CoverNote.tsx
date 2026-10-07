'use client'

// "On the cover" (quick 261007-wms, A-4): on the laptop horizontal blank pass,
// under the question card, a quiet note about the cover photo plus a "Plan a
// trip to {City}" shortcut that fills Where to? with that city. The shortcut
// is a plain text button, never accent or ink-filled: Start planning and the
// accent step button stay the primary actions (handover §4.1 rule 1; the
// second action is Asmeen's accepted exception, 7 Oct 2026).
//
// It fades out (150 ms, ease-out) on the first press, key press or typing
// anywhere else in its panel, and the parent removes it for the page view.
// Tab and bare modifier keys do not count, so keyboard users can reach the
// shortcut. Under reduced motion it goes at once. Phone never shows it.
// Caption and city are repo data rendered as React text only.

import { useEffect, useRef, useState } from 'react'
import { LABEL, TEXT_BUTTON } from './QuestionCard'

type Props = {
  city: string
  /** Verified caption of the cover photo (server-only data); null shows only the shortcut. */
  caption: string | null
  reducedMotion: boolean
  onPlan: () => void
  /** Called once when the note has gone (after the fade, or at once under reduced motion). */
  onDismiss: () => void
}

const IGNORED_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta'])

export function CoverNote({ city, caption, reducedMotion, onPlan, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [fading, setFading] = useState(false)
  const done = useRef(false)
  const latest = useRef({ onDismiss, reducedMotion })
  useEffect(() => {
    latest.current = { onDismiss, reducedMotion }
  })

  function dismiss() {
    if (done.current) return
    done.current = true
    latest.current.onDismiss()
  }

  useEffect(() => {
    const note = ref.current
    const panel = note?.parentElement
    if (!note || !panel) return
    let timer = 0
    const start = (e: Event) => {
      if (done.current || note.contains(e.target as Node)) return
      if (e instanceof KeyboardEvent && IGNORED_KEYS.has(e.key)) return
      if (latest.current.reducedMotion) return dismiss()
      setFading(true)
      // transitionend normally ends it; this covers a transition that never runs.
      window.clearTimeout(timer)
      timer = window.setTimeout(dismiss, 400)
    }
    const events = ['pointerdown', 'keydown', 'input'] as const
    for (const type of events) panel.addEventListener(type, start, true)
    return () => {
      for (const type of events) panel.removeEventListener(type, start, true)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-cover-note=""
      onTransitionEnd={(e) => {
        if (fading && e.target === e.currentTarget) dismiss()
      }}
      className={`hidden transition-opacity duration-150 ease-[var(--ease-out)] motion-reduce:transition-none lg:block ${
        fading ? 'opacity-0' : ''
      }`}
    >
      {caption && (
        <>
          <p className={`${LABEL} text-muted`}>On the cover</p>
          <p className="mt-1 font-read text-base text-ink">
            {caption} · {city}
          </p>
        </>
      )}
      <button type="button" onClick={onPlan} className={`${TEXT_BUTTON} ${caption ? 'mt-1' : ''} -ml-1 text-left`}>
        Plan a trip to {city}
      </button>
    </div>
  )
}
