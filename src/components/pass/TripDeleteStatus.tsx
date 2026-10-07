'use client'

// A trip whose delete failed after the Undo window is back on the home with
// one DELAYED line and Retry (UI-SPEC error copy, D-27, D-33). Retry deletes it
// again with a new 10 s Undo. Nothing shows while no delete has failed.

import { useRouter } from 'next/navigation'
import { useUndo } from '@/components/undo/UndoProvider'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { useCanEdit } from '@/lib/client/use-online'
import { deleteTrip, failedDeleteMessage, useTripDeletes } from '@/lib/plan/delete-trip'

export function TripDeleteStatus() {
  const { failed } = useTripDeletes()
  const { run } = useUndo()
  const router = useRouter()
  const canEdit = useCanEdit()
  if (failed.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {failed.map((f) => (
        <BoardStatusLine
          key={f.id}
          message={failedDeleteMessage(f.city)}
          retryDisabled={!canEdit}
          onRetry={() => deleteTrip({ id: f.id, city: f.city, run, refresh: () => router.refresh() })}
        />
      ))}
    </div>
  )
}
