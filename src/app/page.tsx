import Link from 'next/link'
import { VideoHero } from '@/components/landing/VideoHero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { DestinationCards } from '@/components/landing/DestinationCards'

export default function LandingPage() {
  return (
    <main className="relative">
      {/* Floating nav — absolute over hero */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        {/* Abril Fatface logo — font-logo class, with intentional dot */}
        <Link href="/" className="text-white font-logo text-2xl tracking-tight select-none">
          Barabula.
        </Link>
        <Link
          href="/login"
          className="text-white/90 hover:text-white text-sm font-medium transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero — full viewport video + input */}
      <VideoHero />

      {/* Scroll content — neutral background */}
      <div className="bg-neutral-50">
        <HowItWorks />
        <DestinationCards />
      </div>
    </main>
  )
}
