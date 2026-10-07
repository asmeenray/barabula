'use client'

// Sign-in at Start planning (UI-SPEC §6, D-19). Phone: a Base UI Drawer bottom
// sheet (modal, like every other phone sheet). Laptop: an inline panel inside
// the blank pass body, in place of the question card; the stamp lines stay
// printed above it, no scrim, no centred dialog. The answers are already kept
// on the device (savePending) before this opens, so leaving for Google or the
// email form loses nothing. Focus goes to the heading on open; the caller puts
// it back on Start planning on close. Loaded on first use (BlankPass), so the
// Drawer stays out of the home page's first load.

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Drawer } from '@base-ui/react/drawer'
import { signInWithGoogle } from '@/app/(public)/login/actions'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'

export interface SignInPanelProps {
  /** 'sheet' on phone (Drawer), 'inline' on laptop. */
  variant: 'sheet' | 'inline'
  /** Called once the panel has closed (after the sheet's exit animation). */
  onClose: () => void
  /** Where focus goes when the sheet closes (Start planning). */
  returnFocus?: React.RefObject<HTMLElement | null>
}

const HEADING = 'Check in to save your trip'
const PRIMARY =
  'inline-flex h-12 w-full items-center justify-center rounded-lg bg-ink px-5 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97]'
const TEXT_ACTION =
  'inline-flex min-h-11 items-center px-1 text-base font-semibold text-ink underline underline-offset-[3px]'

/** Heading line, one sentence, Continue with Google, Use email instead, Back to the pass. */
function Body({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<'idle' | 'leaving' | 'failed'>('idle')

  async function continueWithGoogle() {
    if (state === 'leaving') return
    setState('leaving')
    try {
      // Redirects the browser to Google on success (unchanged redirectTo).
      const result = await signInWithGoogle()
      if (result?.error) setState('failed')
    } catch (err) {
      // redirect() rejects with Next's own signal while navigating; let it through.
      if (isRedirect(err)) throw err
      setState('failed')
    }
  }

  return (
    <>
      <p className="mt-1 text-base text-muted">Your answers stay on the pass.</p>
      {state === 'failed' && (
        <BoardStatusLine
          className="mt-4"
          message="Sign-in didn't finish. Your answers are kept."
          retryLabel="Retry sign-in"
          onRetry={continueWithGoogle}
        />
      )}
      <button
        type="button"
        onClick={continueWithGoogle}
        aria-disabled={state === 'leaving' || undefined}
        className={`${PRIMARY} mt-5 ${state === 'leaving' ? 'cursor-progress opacity-40' : ''}`}
      >
        Continue with Google
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
        <Link href="/login" className={TEXT_ACTION}>
          Use email instead
        </Link>
        <button type="button" onClick={onBack} className={TEXT_ACTION}>
          Back to the pass
        </button>
      </div>
    </>
  )
}

function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')
}

function Sheet({ onClose, returnFocus }: SignInPanelProps) {
  const [open, setOpen] = useState(true)
  const titleId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setOpen(false)
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 min-h-dvh bg-[rgb(5_8_12/0.4)] opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[400ms] ease-[var(--ease-sheet)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup
            initialFocus={headingRef}
            finalFocus={returnFocus}
            aria-labelledby={titleId}
            className="flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-2xl bg-surface text-ink shadow-[0_-12px_40px_-12px_rgba(10,20,30,.4)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[var(--ease-sheet)] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none"
          >
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
            <Drawer.Content className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <Drawer.Title
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="font-read text-[22px] leading-[1.2] font-semibold text-balance outline-none"
              >
                {HEADING}
              </Drawer.Title>
              <Body onBack={() => setOpen(false)} />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function Inline({ onClose }: SignInPanelProps) {
  const titleId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        e.stopPropagation()
        onClose()
      }}
      className="py-2 motion-safe:animate-[ticket-in_250ms_var(--ease-out)]"
    >
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="font-read text-[22px] leading-[1.2] font-semibold text-balance text-ink outline-none"
      >
        {HEADING}
      </h2>
      <Body onBack={onClose} />
    </div>
  )
}

export default function SignInPanel(props: SignInPanelProps) {
  return props.variant === 'sheet' ? <Sheet {...props} /> : <Inline {...props} />
}
