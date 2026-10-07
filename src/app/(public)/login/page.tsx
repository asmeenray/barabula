'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signIn, signInWithGoogle } from './actions'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import {
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_PRIMARY,
  AUTH_QUIET,
  AUTH_TEXT_LINK,
  AuthDivider,
  AuthShell,
  GoogleMark,
} from '@/components/auth/AuthShell'

// Sign in (UI-SPEC §12): restyled to the phase 16 tokens. Behaviour is
// unchanged: the same server actions, field ids and names, and error display.

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, signIn() calls redirect('/'), the home pass, which resumes a kept trip
  }

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle()
    // signInWithGoogle() calls redirect(data.url) to Google — browser follows
  }

  return (
    <AuthShell title="Sign in">
      <button type="button" onClick={handleGoogle} disabled={loading} className={`${AUTH_PRIMARY} mt-6`}>
        <GoogleMark />
        Continue with Google
      </button>

      <AuthDivider />

      {error && <BoardStatusLine className="mb-4" message={error} />}

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className={AUTH_LABEL}>
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={AUTH_FIELD} />
        </div>
        <div>
          <label htmlFor="password" className={AUTH_LABEL}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={AUTH_FIELD}
          />
        </div>
        <button type="submit" disabled={loading} className={`${AUTH_QUIET} mt-2`}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-base text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className={AUTH_TEXT_LINK}>
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}
