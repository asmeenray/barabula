// Shared frame for the sign-in and create-account pages (UI-SPEC §12): one
// column, max-width 400, Wordmark, Heading, then the page's content. Styling
// only; the pages keep their own server actions and behaviour.

import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

export const AUTH_LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase'
export const AUTH_FIELD =
  'mt-1.5 h-12 w-full rounded-lg border-[1.5px] border-field bg-surface-2 px-3 text-base text-ink placeholder:text-muted outline-none focus-visible:border-ink focus-visible:outline-none'
export const AUTH_PRIMARY =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'
/** Secondary: on the page colour a --surface-2 fill would vanish (light), so it gets the field border. */
export const AUTH_QUIET =
  'inline-flex h-12 w-full items-center justify-center rounded-lg border-[1.5px] border-field bg-surface px-5 font-label text-base font-semibold tracking-[0.08em] text-ink uppercase transition-[border-color,transform] duration-150 ease-out hover:border-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'
export const AUTH_TEXT_LINK = 'font-semibold text-navy underline underline-offset-[3px]'

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-[400px] flex-col px-4 pt-[calc(48px+env(safe-area-inset-top))] pb-12">
        <Link href="/" aria-label="Barabula, home" className="-mx-2 flex min-h-11 w-fit items-center rounded-lg px-2">
          <Wordmark height={24} />
        </Link>
        <h1 className="mt-10 text-[22px] leading-[1.2] font-semibold text-balance">{title}</h1>
        {children}
      </div>
    </main>
  )
}

/** A rule with "or" between the Google button and the email form. */
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs leading-[1.33] text-muted">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/** Google's "G" mark in its own brand colours (their guidelines ask for the full-colour mark). */
export function GoogleMark() {
  return (
    <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-white">
      <svg className="size-4" viewBox="0 0 24 24" focusable="false">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    </span>
  )
}
