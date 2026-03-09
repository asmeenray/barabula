import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold text-gray-900 text-lg">
          Barabula
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
            Dashboard
          </Link>
          <Link href="/chat" className="text-gray-600 hover:text-gray-900 text-sm">
            Chat
          </Link>
          <span className="text-gray-400 text-sm">{user.email}</span>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
