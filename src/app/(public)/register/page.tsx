'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signUp } from './actions'
import { signInWithGoogle } from '../login/actions'
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

// Create account (UI-SPEC §12): restyled to the phase 16 tokens. The email
// form keeps its server action, field ids and names, and error display.
// "Continue with Google" is the same sign-in action as on /login (a Google
// account needs no separate sign-up).

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle()
    // signInWithGoogle() calls redirect(data.url) to Google — browser follows
  }

  return (
    <AuthShell title="Create account">
      <button type="button" onClick={handleGoogle} disabled={loading} className={`${AUTH_PRIMARY} mt-6`}>
        <GoogleMark />
        Continue with Google
      </button>

      <AuthDivider />

      {error && <BoardStatusLine className="mb-4" message={error} />}

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="full_name" className={AUTH_LABEL}>
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" required autoComplete="name" className={AUTH_FIELD} />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            className={AUTH_FIELD}
          />
        </div>
        <button type="submit" disabled={loading} className={`${AUTH_QUIET} mt-2`}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-8 text-base text-muted">
        Already have an account?{' '}
        <Link href="/login" className={AUTH_TEXT_LINK}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
