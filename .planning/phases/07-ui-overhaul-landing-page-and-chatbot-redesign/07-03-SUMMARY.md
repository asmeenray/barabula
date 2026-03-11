---
phase: 07-ui-overhaul-landing-page-and-chatbot-redesign
plan: "03"
subsystem: landing-page
tags: [landing, video-hero, auth-gate, framer-motion, design, glassmorphism]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [landing-page, video-hero, hero-input, quick-chips, how-it-works, destination-cards]
  affects: [src/app/page.tsx]
tech_stack:
  added: []
  patterns:
    - Lifted state in VideoHero to share input value between HeroInput and QuickChips
    - Cubic bezier ease array cast as [number, number, number, number] tuple for motion/react type safety
    - bg-slate-900 as video fallback background (no poster dependency)
key_files:
  created:
    - src/components/landing/VideoHero.tsx
    - src/components/landing/HeroInput.tsx
    - src/components/landing/QuickChips.tsx
    - src/components/landing/HowItWorks.tsx
    - src/components/landing/DestinationCards.tsx
    - public/images/hero-poster.jpg
    - public/images/destinations/iceland.jpg
    - public/images/destinations/maldives.jpg
    - public/images/destinations/kyoto.jpg
  modified:
    - src/app/page.tsx
    - src/__tests__/video-hero.test.tsx
    - src/__tests__/landing-auth-gate.test.tsx
decisions:
  - Lifted inputValue state to VideoHero to share between HeroInput and QuickChips (chip click fills input)
  - ease cubic bezier annotated as tuple type — motion/react requires [number,number,number,number] not number[]
  - HowItWorks and DestinationCards created in Task 1 alongside Task 1 components (required for page.tsx to compile cleanly)
metrics:
  duration: 5min
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_changed: 12
---

# Phase 7 Plan 03: Landing Page Build Summary

Immersive landing page replacing the one-line redirect-to-dashboard with a cinematic video hero, glassmorphism input bar, quick-pick chips, How It Works section, and destination inspiration cards.

## What Was Built

### Task 1 — VideoHero, HeroInput, QuickChips + page.tsx (TDD)

All 5 landing components created. `page.tsx` replaced with a proper landing page (no more redirect to `/dashboard`).

**VideoHero:** Full-viewport section with `bg-slate-900` background visible while video loads. `<video>` tag with `autoPlay muted loop playsInline preload="none"` and `/images/hero-poster.jpg` poster. Two `<source>` elements (webm + mp4). Dark gradient overlay (`bg-gradient-to-b from-black/20 via-black/35 to-black/65`). Staggered Framer Motion entrance animations for headline, subheadline, input, and chips. "Scroll to explore" hint at bottom.

**HeroInput:** Accepts `value` and `onChange` as props (state lifted to VideoHero). Auth gate logic via `handleGo`: checks `supabase.auth.getUser()` — authenticated users go directly to `/chat?q=<encoded_prompt>`, unauthenticated users call `savePrompt()` then `signInWithOAuth` with `redirectTo: /auth/callback?next=/chat?q=<prompt>`.

**QuickChips:** 5 pills (Going solo, Family trip, Romantic escape, Group adventure, Weekend getaway). Clicking a chip calls `onSelect(prompt)` which sets `inputValue` in VideoHero, filling HeroInput automatically.

**page.tsx:** Server component. Floating nav with Abril Fatface logo and Sign in link. Renders `VideoHero`, then `HowItWorks` + `DestinationCards` in a `bg-neutral-50` scroll section.

### Task 2 — HowItWorks, DestinationCards + real tests

**HowItWorks:** 3-step grid with coral (`text-coral`) large serif numbered steps. `whileInView` scroll animations with `once: true` viewport config.

**DestinationCards:** Iceland / Maldives / Kyoto cards. Each card has hover scale on image, label, title, subtitle, "Start planning →" link in coral on hover. Value prop CTA box below cards with navy "Create a new trip →" button.

**Tests (TDD):**
- `video-hero.test.tsx`: 5 tests — verifies video element exists, `autoPlay muted loop playsInline`, `preload="none"`, webm + mp4 sources, gradient overlay div.
- `landing-auth-gate.test.tsx`: 3 tests — verifies Plan trip button renders, is disabled on empty input, calls `signInWithOAuth` with correct `provider: 'google'` and `redirectTo` containing `/auth/callback?next=/chat?q=`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: ease array type incompatible with motion/react Variants**
- **Found during:** Task 2 (npm run build)
- **Issue:** `ease: [0.22, 1, 0.36, 1]` inferred as `number[]` which is not assignable to `Easing[]` — motion/react expects a 4-tuple for cubic bezier
- **Fix:** Cast as `[number, number, number, number]` tuple type annotation
- **Files modified:** `src/components/landing/VideoHero.tsx`
- **Commit:** 42fbd35

**2. [Rule 2 - Architecture] HowItWorks and DestinationCards created in Task 1**
- **Found during:** Task 1 (page.tsx requires both imports to compile)
- **Issue:** Plan specified HowItWorks/DestinationCards as Task 2, but page.tsx imports them — creating page.tsx without them would cause compile failure
- **Fix:** Created all 5 components together in Task 1, committed as one atomic unit
- **Impact:** Task 2 focused on verifying tests + build pass rather than creating new files

## Self-Check: PASSED

All 10 files found. Both commits (bed8695, 42fbd35) verified in git log. 48/48 tests pass. Build compiles successfully.
