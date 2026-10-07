'use client'

// Motion for the phase 16 UI (UI-SPEC Motion Contract): LazyMotion with the
// domAnimation features in strict mode, so only the small m.* components are
// used (strict throws on a full motion.* component), and MotionConfig
// reducedMotion="user", which follows the OS setting. The domAnimation
// features load as their own chunk after the page has hydrated, so they are
// not in any route's first JS. Wraps the (app) tree only: the old screens
// outside it still use motion.* until 16-23 deletes them.

import { LazyMotion, MotionConfig } from 'motion/react'

const loadDomAnimation = () => import('./features').then((mod) => mod.default)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
