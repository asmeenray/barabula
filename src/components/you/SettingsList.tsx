'use client'

// Settings on the You tab (D-29, UI-SPEC §11): Appearance · Home city ·
// Haptics · Credits & attributions · Sign out, rows 56 high with 1 px
// dividers, and the app version underneath. Export and delete account stay
// hidden until 16.2.

import { useId, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Switch } from '@base-ui/react/switch'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { createClient } from '@/lib/supabase/client'
import { clearPending } from '@/lib/pass/pending'
import { HAPTICS_KEY, hapticsEnabled, setHaptics } from '@/lib/client/haptics'
import { useThemePref } from '@/lib/theme/use-theme'
import type { ThemePref } from '@/lib/theme/theme'
import { ChevronRightIcon } from '@/components/icons'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { HomeCityField } from './HomeCityField'

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase'
const ROW = 'flex min-h-14 items-center justify-between gap-4'

const APPEARANCE: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function Appearance() {
  const [pref, setPref] = useThemePref()
  const labelId = useId()
  return (
    <div className={`${ROW} flex-wrap py-1.5`}>
      <span id={labelId} className="text-base">
        Appearance
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        value={[pref]}
        // A segmented control: one value always stays chosen.
        onValueChange={(v) => {
          const next = v[0] as ThemePref | undefined
          if (next) setPref(next)
        }}
        className="flex h-11 shrink-0 items-center gap-0.5 rounded-full border-[1.5px] border-field p-0.5"
      >
        {APPEARANCE.map((o) => (
          <Toggle
            key={o.value}
            value={o.value}
            className="flex h-full items-center rounded-full px-3.5 text-base whitespace-nowrap text-ink transition-[background-color,color] duration-150 ease-out hover:bg-surface-2 data-[pressed]:bg-ink data-[pressed]:text-bg motion-reduce:transition-none"
          >
            {o.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  )
}

function subscribeHaptics(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === HAPTICS_KEY || e.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

function Haptics() {
  // Stored on the device; on by default (server snapshot = the default).
  const stored = useSyncExternalStore(subscribeHaptics, hapticsEnabled, () => true)
  const [on, setOn] = useState<boolean | null>(null)
  const checked = on ?? stored
  const switchId = useId()
  const helpId = useId()
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={switchId} className="text-base">
          Haptics
        </label>
        <Switch.Root
          id={switchId}
          checked={checked}
          aria-describedby={helpId}
          onCheckedChange={(next) => {
            setHaptics(next)
            setOn(next)
          }}
          className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-[1.5px] border-field bg-surface-2 p-0.5 transition-colors duration-150 ease-out data-checked:border-ink data-checked:bg-ink motion-reduce:transition-none"
        >
          <Switch.Thumb className="size-5 rounded-full bg-ink transition-[translate,background-color] duration-150 ease-out data-checked:translate-x-5 data-checked:bg-bg motion-reduce:transition-none" />
        </Switch.Root>
      </div>
      <p id={helpId} className="mt-1 max-w-[46ch] text-xs leading-[1.33] text-muted">
        Short vibrations on Android when places land or move.
      </p>
    </div>
  )
}

function SignOut() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'leaving' | 'failed'>('idle')

  async function signOut() {
    if (state === 'leaving') return
    setState('leaving')
    // Answers kept for a pending pass belong to this person; drop them first (D-41, T-16-55).
    clearPending()
    const { error } = await createClient().auth.signOut()
    if (error) {
      setState('failed')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="py-1.5">
      <div className={ROW}>
        <button
          type="button"
          onClick={signOut}
          aria-disabled={state === 'leaving' || undefined}
          className={`-mx-1 inline-flex min-h-11 items-center px-1 text-base font-semibold text-ink underline underline-offset-[3px] ${
            state === 'leaving' ? 'cursor-progress opacity-40' : ''
          }`}
        >
          Sign out
        </button>
      </div>
      {state === 'failed' && <BoardStatusLine className="mb-2" message="Couldn't sign out." onRetry={signOut} />}
    </div>
  )
}

export function SettingsList({ homeCity, version }: { homeCity: string | null; version: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className={LABEL}>
        Settings
      </h2>
      <div className="mt-2 divide-y divide-line border-y border-line">
        <Appearance />
        <HomeCityField initial={homeCity} />
        <Haptics />
        <Link
          href="/you/credits"
          className={`${ROW} group text-base`}
        >
          Credits & attributions
          <ChevronRightIcon
            aria-hidden
            className="shrink-0 text-muted transition-[translate,color] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none"
          />
        </Link>
        <SignOut />
      </div>
      <p className={`${LABEL} mt-6`}>Barabula {version}</p>
    </section>
  )
}
