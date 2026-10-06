import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

// Minimal phase 16 shell (UI-SPEC Layout §1): a 56 px top bar under the safe
// area, then the page. Tabs (Trips · Places · You) arrive with their screens.

interface AppShellProps {
  children: React.ReactNode
  signedIn: boolean
}

export function AppShell({ children, signedIn }: AppShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between px-4 lg:px-8">
          <Link
            href="/"
            className="-mx-2 flex min-h-11 items-center rounded-lg px-2"
            aria-label="Barabula, home"
          >
            <Wordmark />
          </Link>
          {!signedIn && (
            <Link
              href="/login"
              className="flex min-h-11 items-center font-label text-base font-semibold text-ink underline underline-offset-[3px]"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
