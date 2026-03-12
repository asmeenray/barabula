'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import Image from 'next/image'

const DESTINATIONS = [
  {
    id: 'iceland',
    label: 'Adventure · Off-beat',
    title: 'Iceland',
    subtitle: '10 days · Nature & Auroras',
    // Downloaded from Pexels during plan setup
    image: '/images/destinations/iceland.jpg',
    width: 800,
    height: 480,
  },
  {
    id: 'maldives',
    label: 'Couples · Honeymoon',
    title: 'Maldives',
    subtitle: '7 days · Overwater Bliss',
    image: '/images/destinations/maldives.jpg',
    width: 800,
    height: 480,
  },
  {
    id: 'kyoto',
    label: 'Solo · Culture',
    title: 'Kyoto',
    subtitle: '8 days · Temples & Food',
    image: '/images/destinations/kyoto.jpg',
    width: 800,
    height: 480,
  },
]

const cardGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

export function DestinationCards() {
  return (
    <section className="pb-24 px-6 max-w-5xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="font-serif text-4xl md:text-5xl text-center mb-12"
        style={{ color: '#285185' }}
      >
        Where to go next
      </motion.h2>

      <motion.div
        variants={cardGrid}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
      >
        {DESTINATIONS.map(dest => (
          <motion.div
            key={dest.id}
            variants={cardItem}
            className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                src={dest.image}
                alt={dest.title}
                width={dest.width}
                height={dest.height}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <p className="text-xs mb-1" style={{ color: 'rgba(111,72,73,0.5)' }}>{dest.label}</p>
              <h3 className="font-semibold text-lg mb-0.5" style={{ color: '#285185' }}>{dest.title}</h3>
              <p className="text-sm mb-3" style={{ color: 'rgba(111,72,73,0.6)' }}>{dest.subtitle}</p>
              <Link
                href="/"
                className="text-sm font-medium inline-flex items-center gap-1"
                style={{ color: '#D67940' }}
              >
                Start planning →
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Value prop copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl p-10 text-center max-w-2xl mx-auto"
      >
        <h3 className="font-serif text-3xl mb-4" style={{ color: '#285185' }}>All-in-One AI Trip Planner</h3>
        <p className="leading-relaxed mb-6" style={{ color: 'rgba(111,72,73,0.6)' }}>
          Looking for the perfect trip planner for your next family vacation, anniversary getaway, or
          birthday trip? You&apos;re in the right place. Ask me anything about planning your vacation
          — from dreamy destinations and cozy stays to flights and itineraries. No more juggling tabs
          and apps.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#285185' }}
        >
          Create a new trip →
        </Link>
      </motion.div>
    </section>
  )
}
