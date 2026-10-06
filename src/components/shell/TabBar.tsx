'use client'

// Phone tab bar (UI-SPEC §1, D-35): Trips · Places · You, fixed at the bottom
// below lg, 64 px + the safe area. Hidden when logged out (Places and You need
// an account). Laptop shows the same tabs in the top bar instead.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUserIcon, MapIcon, TicketIcon } from '@/components/icons'

export const TABS = [
  { key: 'trips', href: '/', label: 'Trips', Icon: TicketIcon },
  { key: 'places', href: '/places', label: 'Places', Icon: MapIcon },
  { key: 'you', href: '/you', label: 'You', Icon: CircleUserIcon },
] as const

export type TabKey = (typeof TABS)[number]['key']

/** Tab roots show the wordmark; every other page is an inner page. */
export const TAB_ROOTS: readonly string[] = TABS.map((t) => t.href)

/** Which tab a path belongs to: Places and You by prefix, everything else (home, trip plans) is Trips. */
export function activeTab(pathname: string | null): TabKey {
  const p = pathname ?? '/'
  if (p === '/places' || p.startsWith('/places/')) return 'places'
  if (p === '/you' || p.startsWith('/you/')) return 'you'
  return 'trips'
}

export function TabBar({ signedIn }: { signedIn: boolean }) {
  const active = activeTab(usePathname())
  if (!signedIn) return null

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex h-16 items-stretch justify-around px-2">
        {TABS.map(({ key, href, label, Icon }) => {
          const isActive = key === active
          return (
            <li key={key} className="flex">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`my-1.5 flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-xl px-3 transition-colors duration-200 ease-out ${
                  isActive ? 'bg-surface-2 text-ink' : 'text-muted'
                }`}
              >
                <Icon size={24} />
                <span className="font-label text-xs leading-none font-semibold">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
