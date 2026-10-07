'use client'

// Right after sign-in (D-19, D-41): if a blank pass was kept on this device,
// create its trip once and open the plan. Rendered by the home page for
// signed-in users only. The in-flight ref stops StrictMode's double effect
// (and a fast Retry) from posting twice; the stored client_ref makes any
// repeat return the same trip (Pitfall 7, T-16-44). The kept answers are
// cleared only after the trip exists, and the only place this navigates to is
// /itinerary/{id} from the API's answer (T-16-41).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearPending, loadPending } from '@/lib/pass/pending'
import { isUuid } from '@/lib/uuid'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'

/** Creates the kept trip; resolves to its id, or null when it could not be made. */
async function createKept(pass: object, clientRef: string): Promise<string | null> {
  try {
    const res = await fetch('/api/itineraries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...pass, client_ref: clientRef }),
    })
    if (!res.ok) return null
    const { id } = (await res.json()) as { id?: unknown }
    return isUuid(id) ? id : null
  } catch {
    return null
  }
}

export function ResumePendingTrip() {
  const router = useRouter()
  const inFlight = useRef(false)
  // The automatic attempt happens once per visit; after that only Retry posts.
  const autoStarted = useRef(false)
  const [failed, setFailed] = useState(false)

  const resume = useCallback(() => {
    if (inFlight.current) return
    // Set before the (async) read, so a second call cannot post twice.
    inFlight.current = true
    void loadPending().then(async (kept) => {
      if (!kept) {
        inFlight.current = false
        return
      }
      const id = await createKept(kept.pass, kept.clientRef)
      if (id) {
        clearPending()
        router.replace(`/itinerary/${id}`)
        return
      }
      // Keep the answers; Retry posts the same client_ref again.
      inFlight.current = false
      setFailed(true)
    })
  }, [router])

  useEffect(() => {
    if (autoStarted.current) return
    autoStarted.current = true
    resume()
  }, [resume])

  if (!failed) return null
  return (
    <BoardStatusLine
      message="Couldn't create the trip. Your answers are kept."
      onRetry={() => {
        setFailed(false)
        resume()
      }}
    />
  )
}
