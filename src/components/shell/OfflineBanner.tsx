'use client'

import { WifiOffIcon } from '@/components/icons'
import { useOnline } from '@/lib/client/use-online'

// D-34 (UI-SPEC §1): full width, directly under the top bar, --surface-2,
// 16 px body text with the wifi-off icon. The status region stays mounted
// (empty while online) so screen readers hear the message when it appears.

export const OFFLINE_MESSAGE = "You're offline, changes are paused"

export function OfflineBanner() {
  const online = useOnline()
  return (
    <div role="status" className="shrink-0">
      {!online && (
        <p className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-base text-ink lg:px-8">
          <WifiOffIcon className="shrink-0" />
          {OFFLINE_MESSAGE}
        </p>
      )}
    </div>
  )
}
