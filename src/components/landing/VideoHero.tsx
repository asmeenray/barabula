'use client'

import { useState } from 'react'
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

export function VideoHero() {
  const [inputValue, setInputValue] = useState('')

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-900">
      {/* Background video — bg-slate-900 shows while video loads */}
      {/* poster: TODO replace with real destination image if needed */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/images/hero-poster.jpg"
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
            Where to next?
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
