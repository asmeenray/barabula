# Phase 7: UI Overhaul - Landing Page and Chatbot Redesign — Research

**Researched:** 2026-03-11
**Domain:** Next.js frontend animation, travel app UX, conversational chat layout, auth flow
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Landing Page**
- Background: High-quality video loop cycling through destination footage (Iceland, Maldives, Kyoto, Patagonia, etc.)
- Hero content: Headline + subheadline centered, AI chat input bar directly on page
- Quick-pick chips: Going solo · Family trip · Romantic escape · Group adventure · Weekend getaway
- Nav: Logo (left) + Sign in / Sign up button (right) — no forced auth wall
- Auth gate: User can type freely in the landing chat box; clicking "Go" / submitting triggers Google OAuth modal/redirect, then carries user + their input to `/chat`
- Scroll section: How it works (3-step) + destination cards + value prop copy

**Chatbot Page (`/chat`)**
- Layout: 50/50 split — left chat, right dynamic panel
- Left: Conversational AI collecting: destination, travel party, dates, origin city, vibe, budget
- Right Phase 1 (collecting): Beautiful destination photo — "Understanding your trip..."
- Right Phase 2 (done): Smooth transition to full itinerary view after generation completes
- Quick-action chips: Looks good · Change dates · Add a budget
- Bottom bar: Itinerary · Flights (future) · Hotels (future)

**Itinerary Standalone**
- Existing `/itinerary/[id]` page kept for direct link sharing

**Auth**
- Google OAuth only (already implemented in Phase 2)
- Unauthenticated users land on `/`, type prompt, hit Go → auth → `/chat?q=<encoded_prompt>`

### Claude's Discretion

- Specific animation easing curves and durations
- Exact color palette (must work with travel photography)
- Font pairing choices
- Scroll section layout details (exact card designs, copy)
- Right panel image source strategy (static curated images vs. destination-based dynamic)
- How the middleware handles the `?q=` param preservation through OAuth flow

### Deferred Ideas (OUT OF SCOPE)

- Flights and Hotels tabs (bottom bar present, functionality deferred)
- Real-time collaboration UI
- Mobile app
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Landing page with video background hero | Video background patterns, preload="none" + autoPlay + muted + playsInline, Vercel Blob hosting |
| UI-02 | Centered headline + AI chat input on hero | Framer Motion entrance animations, glassmorphism input bar on video overlay |
| UI-03 | Quick-pick chip row (5 chips) | Chip component pattern, hover + active states, keyboard accessibility |
| UI-04 | Minimal nav (logo left, sign in right) | Public layout without auth, middleware public path update |
| UI-05 | Auth gate: type freely → Go → OAuth → /chat?q= | signInWithOAuth redirect preservation, sessionStorage fallback, middleware update |
| UI-06 | Scroll sections: how it works + destination cards | whileInView stagger animations, scroll-linked parallax |
| UI-07 | /chat 50/50 split layout (left chat, right panel) | CSS grid split, motion layout transitions |
| UI-08 | Right panel Phase 1: destination photo + "Understanding..." | Framer Motion AnimatePresence, crossfade transition |
| UI-09 | Right panel Phase 2: smooth transition to itinerary view | AnimatePresence exit/enter, layout animation |
| UI-10 | Quick-action chips in chat (Looks good · Change dates · Add a budget) | Chip pattern same as landing |
| UI-11 | Bottom nav bar stub (Itinerary tab active, Flights/Hotels disabled) | Tab bar component, disabled state |
| UI-12 | Typography and color system | DM Serif Display + Inter pairing, custom Tailwind tokens |
| UI-13 | Authenticated layout update (chat page = full-bleed, no max-w-6xl) | Layout override for split-panel page |
</phase_requirements>

---

## Summary

Phase 7 is a ground-up visual redesign of the public landing page and the chat interaction page. The current state of both pages is functionally correct but visually bare — the landing page is a redirect, the chat page is a plain chat bubble list in a white container.

The redesign has two distinct surfaces. The **landing page** borrows directly from layla.ai's pattern: a full-viewport video background, a centered prompt input, and quick-pick chips. The page scrolls into a "How it works" and destination card section. Unauthenticated users can interact freely and the auth gate fires on submission. The **chat page** becomes a 50/50 split panel — left side is the conversational interface, right side is a dynamic panel that shows destination photography while the AI is collecting info, then transitions to the itinerary output.

**Primary recommendation:** Install `motion` (formerly framer-motion) as the sole animation library. Use `<video>` with `preload="none"`, `autoPlay`, `muted`, `loop`, `playsInline` for the background. Preserve the landing prompt through OAuth via `sessionStorage` (set before redirect, read on `/chat` mount). Use CSS Grid for the 50/50 split.

---

## Inspiration Analysis

### layla.ai (from screenshots in `/Inspiration/`)

**Landing page patterns observed:**
- Full-viewport photographic background (beach at sunset — warm pastels, pink/lavender sky)
- Very minimal nav: logo top-left, language/settings top-right — almost no chrome
- Personalized greeting headline: "Hey Asmeen, where are we going today?" — large, white, humanizing
- Subline in slightly smaller, lighter weight: "Tell me your style and budget, and I'll design a trip for you"
- Chat input bar: white/light background, rounded, wide, placeholder text "From a budget Puerto Rican cruise to Portofino", microphone icon on right, "Plan trip" CTA button on right (distinct color — coral/orange-ish)
- Quick-pick chips below the input bar: "Going solo · Explore the unknown · Plan a surprise · Stay in a treehouse · Save a bit" — these are pill-shaped, light background, small text, very casual/playful tone
- Bottom of hero: "Scroll down for more" in tiny text
- The whole hero is restrained — no hard shadows, no heavy UI chrome. Just the scene + text + input

**Chatbot page patterns observed:**
- Left panel: pure conversational UX — no forced form fields. AI asks questions in natural prose, user answers in chat bubbles
- The AI messages are regular prose, not rigid lists. The conversation has personality ("I'd love to! But I'm not a mind reader (yet)...")
- Blue banner showing itinerary summary as the conversation progresses: "Krakow for 3 days"
- Questions are conversational: "Who are you travelling with?", "When are you planning to go?", "What's the vibe?"
- User can type in the input or use suggested replies (chip-like, but contextual)
- Right panel initial state: Single large text "Understanding your trip..." — centered, elegant, dark background
- A curated destination image fills the right panel as context builds
- When itinerary is ready: structured card appears on right — shows day count, close count, experiences, hotels, transports
- Bottom bar is minimal: "Show itinerary · Change dates · Add a budget" — small text chips

**Itinerary creation page (third screenshot):**
- Left panel continues the chat (AI refining the plan)
- Right panel becomes an itinerary card preview with map pin, image, and structured stats
- "Unlock Your Full Trip" paywall pattern appears — this is specific to layla.ai premium; Barabula won't implement this

**Key UX principles from layla.ai:**
1. The AI collects info conversationally — no rigid form. User types naturally or picks chips.
2. The right panel is ambient/visual while collecting — creates anticipation
3. The transition from "collecting" to "here's your plan" is a reveal moment — should feel satisfying
4. Everything is low-chrome: minimal borders, soft backgrounds, no heavy card shadows
5. The typography is clean sans-serif — not generic, but humanistic

### Iceland Travel Dribbble Shot (dribbble.com/shots/19988832)

Direct page fetch returned no structured content (Dribbble blocks scraping). Based on search results and the referenced shot ID, the design is an Iceland travel website showcasing:
- **Parallax scroll effects:** Multiple depth layers scrolling at different speeds — sky, mountains, foreground
- **Text reveal animations:** Large headline text animating in on scroll (opacity + translate Y)
- **Full-bleed imagery:** Photography dominates, UI sits on top with minimal chrome
- **Dramatic color treatment:** Iceland's cool blues, greens, volcanic blacks — gradient overlays preserve legibility
- **Section transitions:** Scroll snapping or smooth morphing between content sections
- **Hover states:** Destination cards that lift/scale on hover with a subtle shadow increase
- **Number/stat reveals:** Animated counters when scrolled into view

**Confidence:** MEDIUM — Dribbble page not directly scrapable; conclusions drawn from shot title, tag patterns, and related Iceland design work verified against general parallax travel design patterns.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` (framer-motion) | ^12.x | Entrance animations, scroll-linked effects, layout transitions, AnimatePresence | Rebrand of framer-motion; same API, import from "motion/react"; standard for Next.js animation |
| `next` | ^16.1.6 | Already installed | App Router, `<video>` support, middleware |
| `tailwindcss` | ^3.4.1 | Already installed | backdrop-blur, bg-black/50 gradient overlays, arbitrary values |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/font/google` | built-in | Font loading without FOUT | Use for DM Serif Display + Inter pairing |
| `@next/third-parties` | built-in | Google Tag Manager etc | Only if analytics needed |

### Not Needed (Don't Add)
| Instead of | Avoid | Reason |
|------------|-------|--------|
| `react-player` | plain `<video>` | Overkill for muted background loop; adds 50kb+ |
| `gsap` | `motion` | Redundant; motion covers all needs for this scope |
| `lottie-react` | CSS + motion keyframes | Lottie files not available; motion keyframes sufficient |
| `react-intersection-observer` | motion's `whileInView` | motion already ships viewport detection |

**Installation (only new library needed):**
```bash
npm install motion
```

**Tailwind extended config needed:**
```js
// tailwind.config.ts — extend with custom tokens
theme: {
  extend: {
    fontFamily: {
      serif: ['DM Serif Display', 'Georgia', 'serif'],
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    colors: {
      'overlay-dark': 'rgba(0, 0, 0, 0.45)',
    },
    backdropBlur: {
      xs: '2px',
    },
  }
}
```

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
├── app/
│   ├── page.tsx                          # REPLACE: new immersive landing page (public)
│   ├── (authenticated)/
│   │   ├── chat/
│   │   │   └── page.tsx                  # REPLACE: split-panel chat page
│   │   └── layout.tsx                    # UPDATE: allow full-bleed override for chat
│   └── auth/
│       └── callback/
│           └── route.ts                  # UPDATE: preserve ?q= param after OAuth
├── components/
│   ├── landing/
│   │   ├── VideoHero.tsx                 # Video background + centered content
│   │   ├── HeroInput.tsx                 # Chat input bar with chips
│   │   ├── QuickChips.tsx                # Reusable chip component
│   │   ├── HowItWorks.tsx                # 3-step scroll section
│   │   └── DestinationCards.tsx          # Destination inspiration cards
│   ├── chat/
│   │   ├── SplitLayout.tsx               # 50/50 grid wrapper
│   │   ├── ChatPanel.tsx                 # Left: message thread + input + chips
│   │   ├── ContextPanel.tsx              # Right: ambient photo → itinerary reveal
│   │   ├── QuickActionChips.tsx          # In-chat quick reply chips
│   │   └── BottomTabBar.tsx              # Itinerary · Flights · Hotels stub
│   └── ui/
│       ├── Chip.tsx                      # Shared pill chip (landing + chat)
│       └── GlassInput.tsx                # Input bar with glass effect
├── lib/
│   └── landing/
│       └── prompt-store.ts               # sessionStorage read/write for ?q= param
public/
└── videos/
    └── hero-loop.mp4                     # Short destination loop (10-15s, WebM + MP4)
```

### Pattern 1: Video Hero Background

**What:** Full-viewport `<video>` positioned as background, with a dark gradient overlay, and foreground content centered over it.
**When to use:** Landing page hero section only.

```tsx
// src/components/landing/VideoHero.tsx
// 'use client' required for motion animations on the foreground content

export function VideoHero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background video — preload="none" critical for performance */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/images/hero-poster.jpg"  // Static fallback shown while video loads
      >
        <source src="/videos/hero-loop.webm" type="video/webm" />
        <source src="/videos/hero-loop.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay — darkens bottom more than top for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* ... HeroInput, QuickChips */}
      </div>
    </section>
  )
}
```

**Key notes:**
- `preload="none"` prevents the video from loading until the browser is idle. The `poster` image shows immediately.
- `playsInline` is mandatory for iOS Safari — without it the video goes fullscreen on mobile.
- Provide both `.webm` (smaller on Chrome/Firefox) and `.mp4` (Safari fallback).
- Target video spec: 10-15 seconds, 720p, no audio track, ~3-5MB. Use FFmpeg: `ffmpeg -i source.mp4 -vf scale=1280:720 -c:v libvpx-vp9 -an -b:v 1M hero-loop.webm`
- Source: [Next.js Video Guide](https://nextjs.org/docs/app/guides/videos) — HIGH confidence

### Pattern 2: Motion Entrance Animations (Hero Text + Input)

**What:** Staggered fade+slide-up entrance for the hero headline, subline, and input bar using `motion` (formerly framer-motion).
**When to use:** Hero section only — elements enter on mount.

```tsx
// 'use client'
import { motion } from 'motion/react'

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },  // custom ease-out
  },
}

export function HeroContent() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.h1 variants={item} className="font-serif text-5xl md:text-7xl text-white text-center">
        Where to next?
      </motion.h1>
      <motion.p variants={item} className="text-white/80 text-lg text-center mt-3">
        Tell me what you love. I'll build the trip.
      </motion.p>
      <motion.div variants={item}>
        <HeroInput />
      </motion.div>
      <motion.div variants={item}>
        <QuickChips />
      </motion.div>
    </motion.div>
  )
}
```

**Key notes:**
- Import from `"motion/react"` — this is the correct import after the framer-motion → motion rebrand (late 2024)
- The ease `[0.22, 1, 0.36, 1]` is a snappy deceleration curve that feels high-end, not mechanical
- `staggerChildren: 0.12` with 4 items = 0.48s total stagger — fast enough to feel responsive
- Source: [motion.dev docs](https://motion.dev/docs/react-animation) — HIGH confidence

### Pattern 3: Scroll-Triggered Section Reveals (whileInView)

**What:** Each section below the hero fades + slides up when scrolled into view. Cards stagger.
**When to use:** "How it works" steps, destination cards.

```tsx
// 'use client'
import { motion } from 'motion/react'

// For a single section
export function HowItWorksStep({ step }: { step: Step }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* step content */}
    </motion.div>
  )
}

// For staggered card grid — wrap parent in motion.div with variants
const cardGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export function DestinationCards() {
  return (
    <motion.div
      variants={cardGrid}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {destinations.map(d => (
        <motion.div key={d.id} variants={cardItem}>
          {/* card */}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

**Key notes:**
- `viewport={{ once: true }}` — animation fires once on entry, not on every scroll direction change. This is correct for content reveals.
- `margin: '-80px'` — triggers animation 80px before the element reaches the viewport edge. Feels natural.
- Source: [motion.dev scroll animations](https://motion.dev/docs/react-scroll-animations) — HIGH confidence

### Pattern 4: Auth Gate with Prompt Preservation

**What:** User types a prompt on `/`, clicks Go → triggers Google OAuth → OAuth redirects back → `/chat?q=<prompt>` is used.
**When to use:** Landing page "Go" button submission.

The challenge: Supabase OAuth is a browser redirect cycle. You cannot pass custom query params through the OAuth provider itself. The safe pattern is:

1. User clicks "Go" with a typed prompt
2. Before redirecting, write the prompt to `sessionStorage` (key: `barabula_pending_prompt`)
3. Trigger `signInWithGoogle()` which redirects to Google → back to `/auth/callback`
4. `/auth/callback` already redirects to `/dashboard` — we need to change this to redirect to `/chat`
5. The `/chat` page reads `sessionStorage` on mount and pre-fills or auto-sends the prompt

**Alternative (simpler):** Pass `?q=<encoded>` as the OAuth `redirectTo` path. Supabase supports this — the `redirectTo` can include a path + query string for the post-auth redirect. The final redirect lands on `/chat?q=<prompt>`.

```ts
// In landing page action (server action or client-side)
// Client-side approach (simpler for preserving the full flow):

async function handleGo(prompt: string) {
  // Save to sessionStorage as belt-and-suspenders
  sessionStorage.setItem('barabula_pending_prompt', prompt)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/chat?q=${encodeURIComponent(prompt)}`,
    },
  })
  if (data?.url) window.location.href = data.url
}
```

```ts
// auth/callback/route.ts — read the `next` param
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'  // default remains /dashboard

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Only allow relative redirects (security: prevent open redirect)
      const redirectPath = next.startsWith('/') ? next : '/dashboard'
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

**Key notes:**
- The `next` param contains `/chat?q=<prompt>` — this is a relative path starting with `/`, so the open-redirect check (`next.startsWith('/')`) passes.
- `sessionStorage` as backup handles the edge case where the `?q=` param gets dropped (some OAuth providers strip unrecognized params — Google generally doesn't, but belt-and-suspenders is wise).
- Already-authenticated users clicking "Go" on the landing page: check `supabase.auth.getUser()` client-side first — if authenticated, skip OAuth and go directly to `/chat?q=<prompt>`.
- Source: [Supabase redirect URLs docs](https://supabase.com/docs/guides/auth/redirect-urls), [Phase 2 auth/callback pattern in existing codebase] — HIGH confidence

### Pattern 5: 50/50 Split Chat Layout

**What:** Full-height split — left panel is the scrollable chat thread + input, right panel is the ambient/itinerary panel.
**When to use:** `/chat` page only.

```tsx
// src/components/chat/SplitLayout.tsx
// This component wraps the chat page and provides the grid structure

export function SplitLayout({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 h-screen overflow-hidden">
      {/* Left: scrollable chat */}
      <div className="flex flex-col h-screen border-r border-gray-100/20">
        {left}
      </div>
      {/* Right: ambient panel — no scroll */}
      <div className="relative h-screen overflow-hidden bg-gray-950">
        {right}
      </div>
    </div>
  )
}
```

**Important — layout override for chat page:**
The current `(authenticated)/layout.tsx` wraps all content in `max-w-6xl mx-auto px-4 py-8`. The split-panel chat needs to break out of this. Options:
1. Move `/chat` outside `(authenticated)/` route group — but then auth check needs to be in the page itself.
2. Use a `layout.tsx` inside `/chat/` that overrides the wrapping with `py-0 px-0 max-w-none`.
3. Add a data attribute to the chat page and override via CSS.

**Recommended:** Option 2 — add `src/app/(authenticated)/chat/layout.tsx` with `className="h-screen overflow-hidden"` and `padding: 0` to override the parent layout's padding.

```tsx
// src/app/(authenticated)/chat/layout.tsx
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 top-0">
      {children}
    </div>
  )
}
```

Actually simpler: modify the chat page to use `h-screen fixed inset-0` or use the `overflow: hidden` on body pattern. The cleanest approach is making the chat page's outer div `fixed inset-0` so it renders full-viewport independently of the parent layout scroll.

### Pattern 6: AnimatePresence for Right Panel Transition

**What:** The right panel transitions from "Understanding your trip..." state to the itinerary display state using motion's AnimatePresence for smooth enter/exit.
**When to use:** When the AI completes itinerary generation and `itineraryData` becomes available.

```tsx
// src/components/chat/ContextPanel.tsx
import { AnimatePresence, motion } from 'motion/react'

export function ContextPanel({ itineraryData, isGenerating }: Props) {
  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait">
        {!itineraryData ? (
          <motion.div
            key="ambient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            {/* Destination photo with "Understanding your trip..." overlay */}
            <AmbientPanel isGenerating={isGenerating} />
          </motion.div>
        ) : (
          <motion.div
            key="itinerary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto p-6"
          >
            {/* Itinerary display */}
            <ItineraryPanel data={itineraryData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Key notes:**
- `mode="wait"` ensures the exiting panel fully exits before the entering panel starts — this prevents overlap during the transition.
- The itinerary panel needs `overflow-y-auto` on the right panel since itinerary content can be long.
- Source: [motion AnimatePresence docs](https://motion.dev/docs/react-animation#exit-animations) — HIGH confidence

### Pattern 7: Glassmorphism Input Bar

**What:** The hero chat input bar looks like frosted glass — semi-transparent white, backdrop-blur, subtle border.
**When to use:** Landing page hero input only (not in chat page where it sits on white/light background).

```tsx
// Tailwind classes for the glass input container
<div className="
  w-full max-w-2xl
  bg-white/15 backdrop-blur-md
  border border-white/30
  rounded-2xl
  px-5 py-4
  flex items-center gap-3
  shadow-lg shadow-black/10
">
  <input
    className="
      flex-1 bg-transparent text-white placeholder:text-white/60
      text-base focus:outline-none
    "
    placeholder="Paris with my partner, 7 days, good food and art..."
  />
  <button className="
    bg-white text-gray-900 rounded-xl px-5 py-2
    text-sm font-semibold hover:bg-white/90
    transition-colors
  ">
    Plan trip
  </button>
</div>
```

### Pattern 8: Quick-Pick Chips

**What:** Pill-shaped suggestion chips below the input bar. Clicking one fills the input with a template prompt.
**When to use:** Landing page hero and in-chat quick actions.

```tsx
// src/components/ui/Chip.tsx
interface ChipProps {
  label: string
  onClick: () => void
  active?: boolean
}

export function Chip({ label, onClick, active }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 rounded-full text-sm font-medium
        border transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-white/50
        ${active
          ? 'bg-white text-gray-900 border-white'
          : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20 hover:border-white/40'
        }
      `}
    >
      {label}
    </button>
  )
}
```

**Keyboard accessibility:** Using `<button>` (not `<div>`) ensures native keyboard focusability and Enter/Space activation. The `focus:ring-2` class handles visible focus state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element entrance on scroll | Custom IntersectionObserver hook | `motion` `whileInView` | motion handles threshold, once, margin, and stagger natively |
| Panel transition (collecting → itinerary) | CSS class swap + manual opacity | `motion` `AnimatePresence` | AnimatePresence handles exit animations before mount of next element; CSS class swap has timing bugs |
| Font loading without flash | Manual `<link rel="preload">` | `next/font/google` | next/font handles preloading, no FOUT, self-hosts the font, generates CSS custom properties |
| Video lazy loading | Custom IntersectionObserver + video ref | `preload="none"` + `poster` attribute | Browsers implement this natively; preload=none defers video byte loading until play intent |
| Prompt preservation through OAuth | Complex URL state management | sessionStorage + `redirectTo` `next` param | OAuth is a redirect cycle; sessionStorage survives same-origin browser navigation; belt-and-suspenders with query param |

**Key insight:** motion/react covers 90% of the animation needs for this phase. Adding GSAP or other animation libraries would create cognitive overhead and bundle bloat. The one area motion doesn't handle is video playback — that's pure native HTML5.

---

## Common Pitfalls

### Pitfall 1: Video Autoplay Blocked on Mobile

**What goes wrong:** The video background doesn't play on iOS/Android because autoplay is blocked.
**Why it happens:** Browsers block autoplay for videos with audio. Even if the video has no audio track, some browsers are cautious. iOS Safari additionally requires `playsInline` to prevent fullscreen.
**How to avoid:** Always combine `autoPlay muted loop playsInline`. Strip the audio track at the source level with FFmpeg (`-an` flag) to guarantee no audio track exists.
**Warning signs:** Video shows first frame as static image on mobile; `play()` console errors.

### Pitfall 2: Framer-Motion Import Is Now `motion/react`

**What goes wrong:** `import { motion } from 'framer-motion'` still works (they kept a compatibility shim) but the package name changed to `motion` in late 2024.
**Why it happens:** The library was rebranded from Framer Motion to Motion.
**How to avoid:** `npm install motion` and import from `"motion/react"`. If you accidentally install `framer-motion`, you get the old package — check package.json.
**Warning signs:** TypeScript errors, stale docs applying to pre-11.x API.

### Pitfall 3: `AnimatePresence` Must Wrap at the Right Level

**What goes wrong:** The exit animation on the right panel doesn't play — the component just disappears instantly.
**Why it happens:** `AnimatePresence` must be a persistent parent of the conditionally rendered children. If you put `AnimatePresence` inside the conditionally rendered component, it unmounts before the exit animation can run.
**How to avoid:** `AnimatePresence` wraps the if/else or ternary — it must survive while both exit and enter animations are running.
**Warning signs:** Elements snap in/out with no transition despite having `exit` props defined.

### Pitfall 4: Chat Layout Breaking Out of Authenticated Parent

**What goes wrong:** The 50/50 split chat page doesn't fill the viewport — it inherits `max-w-6xl` and `py-8` from `(authenticated)/layout.tsx`.
**Why it happens:** Next.js App Router layouts compose — child layouts inherit parent layout wrapping unless explicitly overridden.
**How to avoid:** Add `src/app/(authenticated)/chat/layout.tsx` that resets the container to `fixed inset-0` or overrides the padding. Alternatively, modify the parent layout to accept a `fullBleed` prop via a context, but that's overengineering.
**Warning signs:** Chat panel is indented with large top/bottom margins and a max-width constraint.

### Pitfall 5: The `next` Param in OAuth Redirect Contains `?q=` — Double Encoding

**What goes wrong:** The `?q=` param arrives at `/chat` as `%3Fq%3D...` because it was encoded twice.
**Why it happens:** When building the `redirectTo` URL, if you `encodeURIComponent` the entire `/chat?q=prompt` string and then pass it as a query param, the `?` and `=` get double-encoded.
**How to avoid:** Encode only the prompt value (`encodeURIComponent(prompt)`), not the entire path. The `next` param value is `/chat?q=<encoded_prompt>` where only the prompt is encoded. When reading it in the callback, `new URL(request.url).searchParams.get('next')` will correctly parse it.
**Warning signs:** `/chat?q=...` receives `%3F` in place of `?`.

### Pitfall 6: `'use client'` Requirement for motion Components

**What goes wrong:** TypeScript/runtime error because `motion` components use browser APIs.
**Why it happens:** Next.js App Router defaults to Server Components. `motion` uses React hooks (useRef, useState) internally.
**How to avoid:** Any file that imports from `"motion/react"` must have `'use client'` at the top. This means the VideoHero, HeroContent, and any animated section must be Client Components. Non-animated sections (static footer, etc.) can remain Server Components.
**Warning signs:** "ReactServerComponentsError: You're importing a component that needs useState" or similar.

### Pitfall 7: Video File Size Kills Performance Budget

**What goes wrong:** The hero video takes 5-10+ seconds to start playing on a slow connection, showing a static poster image for too long.
**Why it happens:** Unoptimized video source files can be 20-50MB+.
**How to avoid:** Target <5MB for the hero loop. Use 720p (not 1080p — it's background blur anyway). Use 10-15 second loops (longer = larger file, no perceptual benefit). Store on Vercel Blob or CDN, not in `/public/`. The `poster` image (AVIF/WebP, <50KB) shows instantly.
**Warning signs:** Lighthouse performance score drops significantly; video loading spinner visible for >2 seconds on 3G simulation.

---

## Code Examples

Verified patterns from research:

### Next.js `next/font/google` for DM Serif Display + Inter

```tsx
// src/app/layout.tsx
import { Inter, DM_Serif_Display } from 'next/font/google'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

Then in tailwind.config.ts:
```ts
fontFamily: {
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
},
```

Usage: `className="font-serif"` for headlines, `className="font-sans"` everywhere else.

**Source:** Next.js font optimization docs (built-in, HIGH confidence)

### Framer Motion / motion scroll-linked parallax

```tsx
// 'use client'
import { useScroll, useTransform, motion } from 'motion/react'
import { useRef } from 'react'

export function ParallaxSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-20%'])

  return (
    <div ref={ref} className="relative overflow-hidden h-[60vh]">
      <motion.div style={{ y }} className="absolute inset-0">
        <img src="/images/destination.jpg" className="w-full h-[120%] object-cover" />
      </motion.div>
    </div>
  )
}
```

**Source:** [motion.dev useScroll docs](https://motion.dev/docs/react-scroll-animations) — HIGH confidence

### Supabase OAuth with `redirectTo` including next param

```ts
// Client-side in landing page component
const supabase = createClient()  // browser client

async function handleGo(prompt: string) {
  // Check if already authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    router.push(`/chat?q=${encodeURIComponent(prompt)}`)
    return
  }

  // Belt-and-suspenders: store in sessionStorage
  sessionStorage.setItem('barabula_pending_prompt', prompt)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/chat?q=${encodeURIComponent(prompt)}`,
    },
  })
  // signInWithOAuth triggers a browser redirect; code after this line won't run
}
```

**Source:** [Supabase Auth redirect docs](https://supabase.com/docs/guides/auth/redirect-urls), existing codebase auth pattern — HIGH confidence

---

## Typography and Color System

### Font Pairing

| Role | Font | Weight | Tailwind Class |
|------|------|--------|----------------|
| Hero headline | DM Serif Display | 400 (only weight) | `font-serif text-5xl md:text-7xl` |
| Section headings | DM Serif Display | 400 | `font-serif text-3xl md:text-4xl` |
| Body / UI text | Inter | 400, 500, 600 | `font-sans` |
| Chip labels | Inter | 500 | `font-sans text-sm font-medium` |
| Nav logo | Inter | 700 | `font-sans font-bold` |

**Why DM Serif Display + Inter:**
- DM Serif Display has high contrast, elegant letterforms that feel editorial and premium — not geometric/AI-corporate
- Inter is the most legible UI sans-serif at small sizes; it's humanist, not robotic
- This pairing is used by many premium travel and editorial sites
- Both are available in `next/font/google` with no FOUT
- Confidence: MEDIUM (typography recommendations from multiple authoritative sources)

### Color Palette Strategy

The video background is the dominant visual. The UI must work on TOP of it, not fight it. Strategy:
- **All on-video text:** White or white/80 — never dark text on video
- **Glass surfaces:** `bg-white/10` to `bg-white/20` with `backdrop-blur-md`
- **CTA button on video:** Solid white (`bg-white text-gray-900`) for maximum contrast
- **Scroll sections (below hero):** Near-white background (`bg-neutral-50`) for scroll content; dark text
- **Right panel (chat):** Dark (`bg-gray-950` or `bg-neutral-900`) to create contrast with left white panel
- **Chips on video:** `bg-white/10 text-white/90 border-white/25` — subtle enough not to compete with the scene
- **Accent (for CTAs, progress):** Warm sand/terracotta — `#C97B4B` or similar — evokes travel without being a standard "blue button"

This is Claude's Discretion territory — the exact palette will be refined during implementation. The principle is: video does the visual work, UI is a minimal, light touch on top.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (import from `"motion/react"`) | Late 2024 | New installs should use `motion`; framer-motion shim still works |
| `framer-motion` useScroll with JS scroll events | `scroll()` function uses ScrollTimeline API | Motion v11+ | Hardware-accelerated scroll animations; no JS scroll measurement overhead |
| Video background with `<Image>` fallback | `<video preload="none" poster="...">` with static poster | Always best practice | poster= is native, lighter than JS intersection observer |
| `next/font` import paths | `next/font/google` (same, stable) | Stable since Next.js 13 | No change needed |
| Auth redirect hardcoded to `/dashboard` | `next` query param in redirectTo | Phase 7 pattern | Enables post-auth continuation to any page |

**Deprecated/outdated:**
- `framer-motion` package name: still works (shim) but new projects should use `motion`
- `getSession()` in Supabase: replaced by `getUser()` (already done in this codebase per Phase 2 decisions)
- CRA frontend in `/frontend/`: already retired in Phase 6 (or pending retirement)

---

## Open Questions

1. **Video source hosting**
   - What we know: Vercel Blob is the official recommendation for self-hosted video in Next.js. The `/public/` folder works but serves from the same origin, which can be slow for large files.
   - What's unclear: Whether a 3-5MB video file in `/public/videos/` is acceptable for initial launch given Vercel's edge CDN caches it.
   - Recommendation: Start with `/public/videos/` for simplicity. If Lighthouse performance score suffers, migrate to Vercel Blob.

2. **Right panel destination photo sourcing**
   - What we know: layla.ai shows a curated destination photo on the right panel while collecting trip info (not dynamic per conversation)
   - What's unclear: Should Barabula use a single static beautiful destination photo (simpler), or try to show a photo relevant to the mentioned destination (requires Unsplash API or similar)?
   - Recommendation: Ship with 3-4 static curated photos that rotate randomly. Dynamic destination photos are a v2 enhancement.

3. **Middleware update for `/` public path**
   - What we know: The current middleware's `isPublicPath` check does NOT include `'/'`. The landing page root `/` redirects to `/dashboard` which triggers the auth redirect to `/login` for unauthenticated users.
   - What's unclear: Minor — just needs `pathname === '/'` added to the public paths in middleware.
   - Recommendation: Add `request.nextUrl.pathname === '/'` to `isPublicPath` check. This is a one-line change.

4. **Chat page — authenticated layout override strategy**
   - What we know: The parent layout adds `max-w-6xl mx-auto px-4 py-8` which will break the full-bleed split
   - What's unclear: Cleanest override approach in Next.js App Router
   - Recommendation: Add `src/app/(authenticated)/chat/layout.tsx` with `<div className="h-screen overflow-hidden -mt-8 -mx-4 md:-mx-4">` to counteract the parent padding. Or adjust the parent layout to be less opinionated using CSS variables.

---

## Validation Architecture

> nyquist_validation is `true` in .planning/config.json

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.mts (existing) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | VideoHero renders `<video>` with correct attributes | unit | `npm test -- --run src/__tests__/video-hero.test.tsx` | ❌ Wave 0 |
| UI-03 | Chip component calls onClick and fills input | unit | `npm test -- --run src/__tests__/chip.test.tsx` | ❌ Wave 0 |
| UI-05 | handleGo: authenticated user → pushes to /chat?q=; unauthenticated → calls signInWithOAuth | unit | `npm test -- --run src/__tests__/landing-auth-gate.test.tsx` | ❌ Wave 0 |
| UI-07 | SplitLayout renders two children in grid | unit | `npm test -- --run src/__tests__/split-layout.test.tsx` | ❌ Wave 0 |
| UI-08/09 | ContextPanel shows AmbientPanel when no itineraryData, ItineraryPanel when data present | unit | `npm test -- --run src/__tests__/context-panel.test.tsx` | ❌ Wave 0 |
| UI-10 | QuickActionChips renders and sends message on click | unit | `npm test -- --run src/__tests__/quick-action-chips.test.tsx` | ❌ Wave 0 |

**Notes on testability:**
- `motion` components render fine in jsdom via Vitest — no special mocking needed for basic render tests
- Video autoplay cannot be tested in jsdom (no media element support); test attribute presence only
- The auth gate (`handleGo`) requires mocking the Supabase client; follow the existing ESM mock pattern from Phase 3

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/video-hero.test.tsx` — covers UI-01
- [ ] `src/__tests__/chip.test.tsx` — covers UI-03
- [ ] `src/__tests__/landing-auth-gate.test.tsx` — covers UI-05
- [ ] `src/__tests__/split-layout.test.tsx` — covers UI-07
- [ ] `src/__tests__/context-panel.test.tsx` — covers UI-08/09
- [ ] `src/__tests__/quick-action-chips.test.tsx` — covers UI-10
- [ ] Install: `npm install motion` — not yet in package.json

---

## Sources

### Primary (HIGH confidence)
- [Next.js Video Guide](https://nextjs.org/docs/app/guides/videos) — video background attributes, preload, poster, playsInline
- [motion.dev](https://motion.dev/) — official docs for motion (formerly framer-motion) v12.x
- [Supabase Auth redirect-urls docs](https://supabase.com/docs/guides/auth/redirect-urls) — OAuth redirectTo with custom next param
- Existing codebase: `middleware.ts`, `login/actions.ts`, `(authenticated)/layout.tsx`, `chat/page.tsx`
- `/Inspiration/` screenshots: layla.ai landing page, chatbot page, itinerary creation, scroll section

### Secondary (MEDIUM confidence)
- [Layla AI Travel Planner Behance](https://www.behance.net/gallery/200147257/Layla-AI-Travel-Planner) — design system color and typography patterns
- [motion.dev scroll animations](https://motion.dev/docs/react-scroll-animations) — useScroll, useTransform, whileInView
- [WebSearch: motion/react 2025 scroll animations] — confirmed ScrollTimeline API acceleration in v11+
- [WebSearch: Next.js video performance 2025] — confirmed preload="none" + muted + playsInline best practice

### Tertiary (LOW confidence — needs validation during implementation)
- Iceland travel website animation patterns: Dribbble page not scrapable; conclusions drawn from shot title + related Iceland design searches + general parallax travel design conventions
- Right panel ambient photo approach: inferred from layla.ai screenshots, no direct source documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed packages, motion.dev official docs, Next.js docs
- Architecture patterns: HIGH — verified against existing codebase, official docs, and working layla.ai screenshots
- Auth gate flow: HIGH — verified against existing `login/actions.ts`, Supabase redirect docs, and middleware
- Typography/Color: MEDIUM — multiple authoritative sources agree on DM Serif + Inter; exact color values are Claude's Discretion
- Iceland animation patterns: LOW — Dribbble page not scrapable; general parallax travel conventions applied
- Pitfalls: HIGH — most from direct code analysis of existing codebase + official docs

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (motion API is stable; Supabase OAuth pattern is stable)
