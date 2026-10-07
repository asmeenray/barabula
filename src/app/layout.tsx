import type { Metadata, Viewport } from 'next'
import { Archivo_Narrow, Atkinson_Hyperlegible_Next, Geist_Mono } from 'next/font/google'
import './globals.css'

// Variable names must not be --font-mono/--font-label/--font-read: those are
// the Tailwind theme tokens in globals.css that point at these (Pitfall 4).
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-archivo-narrow',
  display: 'swap',
})

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-atkinson',
  display: 'swap',
  // next/font has no metric overrides for this family yet; skip the generated
  // fallback face instead of warning on every build.
  adjustFontFallback: false,
  fallback: ['system-ui', 'sans-serif'],
})

// Static string, no user input (T-16-13). Sets data-theme before first paint
// from the device choice (barabula-theme: light | dark) or the OS setting.
// Also writes the tz cookie (the device's IANA time zone) so the server can
// work out the user's own "today" for the Trips home (Pitfall 9, 16-12); the
// server treats it as untrusted and falls back to UTC (T-16-35).
const THEME_SCRIPT = `(function(){try{document.cookie='tz='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+'; path=/; max-age=31536000; samesite=lax'}catch(e){}try{var t=localStorage.getItem('barabula-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`

export const metadata: Metadata = {
  title: 'Barabula',
  description: 'The places you saved, turned into a trip.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF1F4' },
    { media: '(prefers-color-scheme: dark)', color: '#080D10' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistMono.variable} ${archivoNarrow.variable} ${atkinson.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <div className="root">{children}</div>
      </body>
    </html>
  )
}
