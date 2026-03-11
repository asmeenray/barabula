'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ProfileDropdownProps {
  name: string
  email: string
  avatarUrl: string | null
}

const MENU_ITEMS = [
  { label: 'New Trip', href: '/chat', icon: '+' },
  { label: 'My Trips', href: '/dashboard', icon: '⊙' },
  { label: 'Manage Subscription', href: '/subscription', icon: '♛' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
]

const FOOTER_ITEMS = [
  { label: 'About', href: '/about', icon: '?' },
  { label: 'Contact', href: '/contact', icon: '◯' },
  { label: 'Terms of service', href: '/terms', icon: '☰' },
]

function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl: string | null; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${dim} rounded-full object-cover ring-2 ring-sand-dark`}
      />
    )
  }

  return (
    <div className={`${dim} rounded-full bg-navy text-white flex items-center justify-center font-semibold ring-2 ring-sand-dark`}>
      {initials}
    </div>
  )
}

export function ProfileDropdown({ name, email, avatarUrl }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const firstName = name.split(' ')[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-coral/30 transition-all focus:outline-none"
        aria-label="Profile menu"
      >
        <Avatar name={name} avatarUrl={avatarUrl} size="sm" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-sand-dark/30 overflow-hidden z-50">
          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-sand-dark/20">
            <Avatar name={name} avatarUrl={avatarUrl} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
              <p className="text-xs text-gray-400 truncate">{email}</p>
            </div>
          </div>

          {/* Main menu */}
          <div className="py-1.5">
            {MENU_ITEMS.map(item => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-sand transition-colors"
              >
                <span className="text-gray-400 w-4 text-center text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-sand-dark/20 py-1.5">
            {FOOTER_ITEMS.map(item => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-sand transition-colors"
              >
                <span className="text-gray-300 w-4 text-center text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-sand-dark/20 p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-coral font-medium hover:bg-coral/5 rounded-xl transition-colors"
            >
              <span className="text-base">→</span>
              Sign out
            </button>
          </div>

          <div className="px-4 py-2 text-center">
            <p className="text-xs text-gray-300">Hey {firstName} 👋</p>
          </div>
        </div>
      )}
    </div>
  )
}
