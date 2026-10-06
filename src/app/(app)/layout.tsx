import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/AppShell'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'

// New phase 16 shell. The user is optional here (logged-out home comes later);
// pages that need an owner check it themselves.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <LiveRegionProvider>
      {/* One Undo toast for the whole app shell (16-09); it survives navigation
          between the plan and Trips, so a held delete still commits. */}
      <UndoProvider>
        <AppShell signedIn={!!user}>{children}</AppShell>
      </UndoProvider>
    </LiveRegionProvider>
  )
}
