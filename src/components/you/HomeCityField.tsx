'use client'

// Home city on the You tab (D-43): saved to the user's own Supabase
// user_metadata with the browser auth client's update-user call, so it
// follows the account across devices. No table, no column. Display-only
// (T-16-54): never used for RLS, routing or authorization; plain text, 1–80
// characters after trimming. An empty field removes it.
// Suggestions come from the curated city names (KNOWN_CITIES, client-safe).

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@base-ui/react/combobox'
import { createClient } from '@/lib/supabase/client'
import { cleanHomeCity, homeCitySuggestions, HOME_CITY_MAX } from '@/lib/you/home-city'
import { useCanEdit } from '@/lib/client/use-online'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'

const FIELD =
  'h-12 w-full min-w-0 rounded-lg border-[1.5px] border-field bg-surface-2 px-3 text-base text-ink placeholder:text-muted outline-none focus-visible:border-ink focus-visible:outline-none'
const TEXT_BUTTON =
  'inline-flex min-h-11 shrink-0 items-center px-1 font-semibold text-ink underline underline-offset-[3px]'

export function HomeCityField({ initial }: { initial: string | null }) {
  const router = useRouter()
  const announce = useAnnounce()
  const canEdit = useCanEdit()
  const inputId = useId()
  const [saved, setSaved] = useState(initial ?? '')
  const [value, setValue] = useState(initial ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle')
  const [open, setOpen] = useState(false)
  const suggestions = useMemo(() => homeCitySuggestions(value), [value])

  // Text typed before hydration has no React listener; pick it up once on mount.
  const adopted = useRef(false)
  const adoptTyped = useCallback((el: HTMLInputElement | null) => {
    if (!el || adopted.current) return
    adopted.current = true
    if (el.value !== el.defaultValue) setValue(el.value.slice(0, HOME_CITY_MAX))
  }, [])

  const dirty = cleanHomeCity(value) !== saved

  async function save(raw: string) {
    if (!canEdit || state === 'saving') return
    const next = cleanHomeCity(raw)
    setValue(next)
    if (next === saved) return
    setState('saving')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { home_city: next || null } })
    if (error) {
      setState('failed')
      return
    }
    setSaved(next)
    setState('idle')
    announce(next ? `Home city saved: ${next}.` : 'Home city removed.')
    router.refresh()
  }

  return (
    <div className="py-3">
      <form
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save(value)
        }}
      >
        <label htmlFor={inputId} className="min-w-28 text-base">
          Home city
        </label>
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
          <Combobox.Root
            items={suggestions}
            filteredItems={suggestions}
            value={null}
            // Open only with suggestions to show: an open popup hides the rest
            // of the row (Save) from assistive tech, even when its list is empty.
            open={open && suggestions.length > 0}
            onOpenChange={setOpen}
            onValueChange={(v) => {
              if (typeof v === 'string') void save(v)
            }}
            inputValue={value}
            onInputValueChange={(v) => {
              setValue(v.slice(0, HOME_CITY_MAX))
              if (state === 'failed') setState('idle')
            }}
          >
            <Combobox.Input
              ref={adoptTyped}
              id={inputId}
              name="home_city"
              placeholder="Add your home city"
              maxLength={HOME_CITY_MAX}
              autoComplete="off"
              enterKeyHint="done"
              readOnly={!canEdit}
              className={FIELD}
            />
            <Combobox.Portal>
              <Combobox.Positioner sideOffset={4} className="z-30 outline-none">
                <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-lg border-[1.5px] border-field bg-surface py-1 text-ink shadow-[0_12px_32px_-12px_rgba(10,20,30,.35)] data-[empty]:hidden">
                  <Combobox.List>
                    {(name: string) => (
                      <Combobox.Item
                        key={name}
                        value={name}
                        className="flex min-h-11 cursor-default items-center px-3 text-base outline-none select-none data-[highlighted]:bg-surface-2"
                      >
                        {name}
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
          {dirty && (
            <button
              type="submit"
              aria-disabled={!canEdit || state === 'saving' || undefined}
              className={`${TEXT_BUTTON} ${!canEdit || state === 'saving' ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {state === 'saving' ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </form>
      {state === 'failed' && (
        <BoardStatusLine className="mt-2" message="Couldn't save." onRetry={() => void save(value)} retryDisabled={!canEdit} />
      )}
    </div>
  )
}
