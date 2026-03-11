import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VideoHero } from '@/components/landing/VideoHero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { DestinationCards } from '@/components/landing/DestinationCards'
import { ProfileDropdown } from '@/components/ui/ProfileDropdown'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userName = user
    ? (user.user_metadata?.full_name ?? user.user_metadata?.name ?? null)
    : null
  const firstName = userName ? userName.split(' ')[0] : null

  const avatarUrl = user?.user_metadata?.avatar_url ?? null
  const email = user?.email ?? ''

  return (
    <main className="relative">
      {/* Floating nav — absolute over hero */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-white font-logo text-2xl tracking-tight select-none">
          Barabula.
        </Link>
        {user ? (
          <ProfileDropdown name={userName ?? email} email={email} avatarUrl={avatarUrl} />
        ) : (
          <Link
            href="/login"
            className="text-white/90 hover:text-white text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
        )}
      </nav>

      {/* Hero — full viewport video + input */}
      <VideoHero userName={firstName} />

      {/* Scroll content — neutral background */}
      <div className="bg-neutral-50">
        <HowItWorks />
        <DestinationCards />
      </div>
    </main>
  )
}
