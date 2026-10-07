'use client'

// Motion for the phase 16 UI (UI-SPEC Motion Contract): LazyMotion with the
// domAnimation features in strict mode, so only the small m.* components are
// used (strict throws on a full motion.* component), and MotionConfig
// reducedMotion="user", which follows the OS setting. Wraps the (app) tree
// only: the old screens outside it still use motion.* until 16-23 deletes them.
//
// The domAnimation features are their own chunk and load on first need: a
// screen with m.* components calls useMotionFeatures() when it mounts (the
// home blank pass does). The plan route animates with CSS only, so it never
// downloads them (route JS budget, Q63).

import { useEffect } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'

let requestFeatures: () => void = () => {}
const featuresWanted = new Promise<void>((resolve) => {
  requestFeatures = resolve
})

const loadDomAnimation = () => featuresWanted.then(() => import('./features')).then((mod) => mod.default)

/** Starts the domAnimation download (once); call it where m.* components animate. */
export function useMotionFeatures(): void {
  useEffect(() => {
    requestFeatures()
  }, [])
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
