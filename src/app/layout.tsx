import type { Metadata } from 'next'
import { Inter, DM_Serif_Display, Abril_Fatface } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

// Logo font only — bold, editorial, travel-magazine feel
const abrilFatface = Abril_Fatface({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-abril',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Barabula',
  description: 'AI-powered group trip planning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable} ${abrilFatface.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
