'use client'

// Top bar (UI-SPEC §1, D-35): 56 px under the safe area.
// root  = Wordmark left; on lg the tabs Trips · Places · You beside it.
//         Logged out: Wordmark + "Sign in", no tabs.
// inner = back button (arrow-left + label) left, an actions slot right, and on
//         lg the tabs too, because laptop has no bottom bar (discretion).
// Both variants carry the offline banner (D-34) right under the bar, so it
// sits under whichever top bar a page shows (inner pages render their own).

import { createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wordmark } from '@/components/brand/Wordmark'
import { ArrowLeftIcon } from '@/components/icons'
import { OfflineBanner } from './OfflineBanner'
import { TABS, TAB_ROOTS, activeTab } from './TabBar'

// Set once by AppShell from the server's auth check, so pages (and not-found)
// can render a top bar without asking Supabase again.
const SignedInContext = createContext(false)

export function SignedInProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return <SignedInContext.Provider value={signedIn}>{children}</SignedInContext.Provider>
}

type TopBarProps =
  | { variant: 'root' }
  | {
      variant: 'inner'
      back: { href: string; label: 'Trips' | 'You' }
      actions?: React.ReactNode
    }

function LaptopTabs() {
  const active = activeTab(usePathname())
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {TABS.map(({ key, href, label }) => {
          const isActive = key === active
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 font-label text-base font-semibold tracking-[0.08em] uppercase transition-colors duration-200 ease-out ${
                  isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function TopBar(props: TopBarProps) {
  const signedIn = useContext(SignedInContext)
  return (
    <>
      <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-6 px-4 lg:px-8">
          {props.variant === 'root' ? (
            <Link href="/" aria-label="Barabula, home" className="-mx-2 flex min-h-11 items-center rounded-lg px-2">
              <Wordmark height={20} />
            </Link>
          ) : (
            <Link
              href={props.back.href}
              aria-label={`Back to ${props.back.label === 'Trips' ? 'trips' : 'You'}`}
              className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-lg pr-3 pl-2 font-label text-base font-semibold tracking-[0.08em] text-ink uppercase"
            >
              <ArrowLeftIcon />
              {props.back.label}
            </Link>
          )}

          {signedIn && <LaptopTabs />}

          <div className="ml-auto flex items-center gap-2">
            {props.variant === 'inner' && props.actions}
            {props.variant === 'root' && !signedIn && (
              <Link
                href="/login"
                className="flex min-h-11 items-center font-semibold text-ink underline underline-offset-[3px]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <OfflineBanner />
    </>
  )
}

/** The shell's top bar: the root variant on tab roots only; inner pages render their own. */
export function ShellTopBar() {
  const pathname = usePathname()
  if (!TAB_ROOTS.includes(pathname ?? '')) return null
  return <TopBar variant="root" />
}
