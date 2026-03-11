'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { HeroInput } from './HeroInput'
import { QuickChips } from './QuickChips'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const HERO_POSTERS = [
  '/images/hero-01.jpg',
  '/images/hero-02.jpg',
  '/images/hero-03.jpg',
  '/images/hero-04.jpg',
  '/images/hero-05.jpg',
  '/images/hero-06.jpg',
  '/images/hero-07.jpg',
  '/images/hero-08.jpg',
  '/images/hero-09.jpg',
  '/images/hero-10.jpg',
  '/images/hero-11.jpg',
  '/images/hero-12.jpg',
]

// Cycle through posters serially — random start for first-time visitors
function nextPoster(): string {
  const key = 'hero_poster_index'
  const stored = localStorage.getItem(key)
  const current = stored !== null
    ? parseInt(stored, 10)
    : Math.floor(Math.random() * HERO_POSTERS.length) - 1  // -1 so next() lands on random start
  const next = (current + 1) % HERO_POSTERS.length
  localStorage.setItem(key, String(next))
  return HERO_POSTERS[next]
}

interface VideoHeroProps {
  userName?: string | null
}

export function VideoHero({ userName }: VideoHeroProps) {
  const [inputValue, setInputValue] = useState('')
  // Start with null (same on server + client), set random poster after hydration
  const [poster, setPoster] = useState<string | null>(null)

  useEffect(() => {
    setPoster(nextPoster())
  }, [])

  const headline = userName
    ? `Hey ${userName}, where to next?`
    : 'Where to next?'

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-900">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={poster ?? undefined}
      >
        <source src="/videos/hero-loop.webm" type="video/webm" />
        <source src="/videos/hero-loop.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/65 pointer-events-none" />

      {/* Foreground */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-5 w-full"
        >
          <motion.h1
            variants={item}
            className="font-serif text-5xl md:text-7xl text-white leading-tight max-w-3xl"
          >
            {headline}
          </motion.h1>
          <motion.p
            variants={item}
            className="text-white/75 text-lg md:text-xl max-w-md"
          >
            Tell me your style and budget. I&apos;ll design the trip.
          </motion.p>
          <motion.div variants={item} className="w-full flex justify-center">
            <HeroInput value={inputValue} onChange={setInputValue} />
          </motion.div>
          <motion.div variants={item}>
            <QuickChips onSelect={setInputValue} />
          </motion.div>
        </motion.div>
      </div>

      {/* Subtle scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs tracking-widest uppercase">
        Scroll to explore
      </div>
    </section>
  )
}
