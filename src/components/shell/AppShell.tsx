import { ShellTopBar, SignedInProvider } from './TopBar'
import { TabBar } from './TabBar'
import { ThemeSync } from './ThemeSync'

// Phase 16 shell (UI-SPEC Layout §1, D-35). Tab roots (/, /places, /you) get
// the root top bar here; inner pages (trip plan, credits, not found) render
// their own TopBar 'inner'. The phone tab bar shows when signed in, and the
// content pads so nothing sits under it.

// The phone tab bar's height (64 + safe area). Kept here, not imported from the
// 'use client' TabBar module: a server component would get a client reference.
const TAB_BAR_PADDING = 'max-lg:pb-[calc(64px+env(safe-area-inset-bottom))]'

interface AppShellProps {
  children: React.ReactNode
  signedIn: boolean
}

export function AppShell({ children, signedIn }: AppShellProps) {
  return (
    <SignedInProvider signedIn={signedIn}>
      <ThemeSync />
      <div className={`flex h-dvh flex-col overflow-hidden bg-bg text-ink ${signedIn ? TAB_BAR_PADDING : ''}`}>
        <ShellTopBar />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
      <TabBar signedIn={signedIn} />
    </SignedInProvider>
  )
}
