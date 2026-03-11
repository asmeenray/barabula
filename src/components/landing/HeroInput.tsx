'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassInput } from '@/components/ui/GlassInput'
import { savePrompt } from '@/lib/landing/prompt-store'

interface HeroInputProps {
  value: string
  onChange: (v: string) => void
}

export function HeroInput({ value, onChange }: HeroInputProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGo() {
    const prompt = value.trim()
    if (!prompt) return
    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Already authenticated — go straight to chat
      router.push(`/chat?q=${encodeURIComponent(prompt)}`)
      return
    }

    // Not authenticated — save prompt and trigger OAuth
    savePrompt(prompt)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/chat?q=${encodeURIComponent(prompt)}`,
      },
    })
    // signInWithOAuth triggers a browser redirect; nothing runs after this
  }

  return (
    <GlassInput
      value={value}
      onChange={onChange}
      onSubmit={handleGo}
      placeholder="Paris with my partner for 7 days, good food and art..."
      disabled={loading}
    />
  )
}
