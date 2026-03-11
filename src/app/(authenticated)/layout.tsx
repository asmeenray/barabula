import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileDropdown } from '@/components/ui/ProfileDropdown'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Traveller'
  const email = user.email ?? ''
  const avatarUrl = user.user_metadata?.avatar_url ?? null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-sand/30">
      <nav className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-sand-dark/30 px-6 py-3 flex items-center justify-between z-30">
        <Link href="/" className="font-logo text-navy text-2xl tracking-tight select-none">
          Barabula.
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-navy/60 hover:text-navy text-sm transition-colors">
            Dashboard
          </Link>
          <Link href="/chat" className="text-navy/60 hover:text-navy text-sm transition-colors">
            Chat
          </Link>
          <ProfileDropdown name={name} email={email} avatarUrl={avatarUrl} />
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
