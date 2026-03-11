'use client'

import { motion } from 'motion/react'

const STEPS = [
  {
    number: '01',
    title: 'Tell us your vibe',
    description:
      "Describe your dream trip in plain language — destination, dates, who you're travelling with, what you love doing.",
  },
  {
    number: '02',
    title: 'AI builds your itinerary',
    description:
      "Barabula's AI designs a day-by-day plan tailored to you — not a generic template. Every detail, every day.",
  },
  {
    number: '03',
    title: 'Share with your group',
    description:
      'Invite travel partners to view or co-edit the plan. Everyone stays on the same page, wherever they are.',
  },
]

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

export function HowItWorks() {
  return (
    <section className="py-24 px-6 max-w-5xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="font-serif text-4xl md:text-5xl text-gray-900 text-center mb-16"
      >
        How it works
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-12"
      >
        {STEPS.map(step => (
          <motion.div key={step.number} variants={stepVariants}>
            <div className="text-4xl font-serif text-coral mb-4">{step.number}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
