---
phase: 07-ui-overhaul-landing-page-and-chatbot-redesign
verified: 2026-03-11T00:00:00Z
status: human_needed
score: 13/13 must-haves verified (automated); 7 items require human visual check
human_verification:
  - test: "Landing page hero renders at /"
    expected: "Full-viewport dark/video background, 'Where to next?' headline in DM Serif Display, glassmorphism input bar centered, 5 chips below, entrance stagger animation plays"
    why_human: "Video autoplay, font rendering, and animation timing require a browser"
  - test: "Landing page scroll sections"
    expected: "How it works (3 numbered steps in coral) and destination cards (Iceland, Maldives, Kyoto) fade in on scroll via whileInView"
    why_human: "ScrollIntersectionObserver-driven animations cannot be verified with grep"
  - test: "Quick chip fills input"
    expected: "Clicking 'Romantic escape' fills the GlassInput with the romantic trip prompt text"
    why_human: "React state lifting between QuickChips and HeroInput requires browser interaction"
  - test: "Auth gate redirect fires"
    expected: "Typing a trip description and clicking Plan trip triggers Google OAuth redirect (signInWithOAuth called with correct redirectTo including /auth/callback?next=/chat?q=...)"
    why_human: "OAuth redirect requires a real browser session"
  - test: "Chat page 50/50 split layout"
    expected: "Visiting /chat shows full-viewport grid with left white chat panel and right dark ambient panel; no max-width constraint; nav fully covered by z-30 overlay"
    why_human: "CSS stacking context (z-30 over parent nav) must be verified visually"
  - test: "Right panel AnimatePresence transition"
    expected: "After AI generates an itinerary, right panel smoothly fades from ambient photo to itinerary summary card (opacity fade + y translate)"
    why_human: "Animation transition requires a live AI conversation to trigger"
  - test: "Design quality — premium, human-crafted feel"
    expected: "Landing page and chat page match the layla.ai-inspired design: DM Serif Display headlines, Abril Fatface logo, coral/navy palette, glassmorphism input, immersive dark right panel"
    why_human: "Subjective visual quality judgment; design goal is non-automated"
---

# Phase 7: UI Overhaul — Landing Page and Chatbot Redesign Verification Report

**Phase Goal:** Deliver a premium, immersive UI overhaul for both the landing page and the chat experience, establishing a cohesive travel-brand design system.
**Verified:** 2026-03-11
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Landing page exists at / (not a redirect to /dashboard) | VERIFIED | `src/app/page.tsx` is a 33-line server component importing VideoHero, HowItWorks, DestinationCards — no redirect |
| 2  | motion package is installed | VERIFIED | `package.json` deps: `"motion": "^12.35.2"` |
| 3  | DM Serif Display font configured as font-serif Tailwind class | VERIFIED | `tailwind.config.ts` line 13: `serif: ['var(--font-dm-serif)', 'Georgia', 'serif']`; `layout.tsx` imports `DM_Serif_Display` with `variable: '--font-dm-serif'` on `<html>` |
| 4  | Abril Fatface font configured as font-logo Tailwind class | VERIFIED | `tailwind.config.ts` line 14: `logo: ['var(--font-abril)', 'Georgia', 'serif']`; `layout.tsx` imports `Abril_Fatface` with `variable: '--font-abril'` |
| 5  | Brand color tokens navy/coral/umber/sky present in tailwind.config.ts | VERIFIED | Lines 17–22: navy (#285185), coral (#D67940), umber (#6F4849), sky (#CCD9E2) all defined |
| 6  | Chip component renders as button with correct active/inactive states | VERIFIED | `src/components/ui/Chip.tsx` — `<button type="button">`, active: `bg-white text-gray-900 border-white`, inactive: `bg-white/10 text-white/90 border-white/20` |
| 7  | GlassInput renders with glassmorphism classes | VERIFIED | `src/components/ui/GlassInput.tsx` — `bg-white/15 backdrop-blur-md border border-white/30` on wrapper div |
| 8  | prompt-store.ts exports savePrompt/getPrompt/clearPrompt via sessionStorage | VERIFIED | `src/lib/landing/prompt-store.ts` — all three functions present with `typeof window === 'undefined'` SSR guard, uses `sessionStorage.setItem/getItem/removeItem` |
| 9  | Unauthenticated users can visit / without redirect to /login | VERIFIED | `middleware.ts` line 33: `request.nextUrl.pathname === '/'` in isPublicPath; exact match prevents over-broad exposure |
| 10 | auth/callback supports ?next param that carries user to /chat?q= after OAuth | VERIFIED | `src/app/auth/callback/route.ts` — reads `searchParams.get('next') ?? '/'`, enforces `next.startsWith('/')`, redirects to `${origin}${next}` |
| 11 | /chat page renders as 50/50 full-viewport split layout | VERIFIED | `src/app/(authenticated)/chat/layout.tsx` — `fixed inset-0 z-30 bg-white`; `src/components/chat/SplitLayout.tsx` — `grid grid-cols-2 h-screen overflow-hidden` |
| 12 | Right panel transitions between ambient and itinerary states with AnimatePresence | VERIFIED | `src/components/chat/ContextPanel.tsx` — `AnimatePresence mode="wait"` wrapping conditional; ambient exits `opacity:0 scale:0.98`, itinerary enters `opacity:0 y:20` |
| 13 | Chat page reads ?q= query param and pre-fills input | VERIFIED | `src/app/(authenticated)/chat/page.tsx` — `useSearchParams().get('q') ?? getPrompt() ?? ''` with Suspense boundary per Next.js App Router requirement |

**Score:** 13/13 truths verified (automated). 7 items require human visual check.

---

## Required Artifacts

| Artifact | Provides | Status | Notes |
|----------|----------|--------|-------|
| `src/components/ui/Chip.tsx` | Reusable pill chip for landing + chat quick actions | VERIFIED | 25 lines, substantive, exports `Chip` |
| `src/components/ui/GlassInput.tsx` | Glassmorphism input bar for hero | VERIFIED | 40 lines, substantive, exports `GlassInput` |
| `src/lib/landing/prompt-store.ts` | sessionStorage helpers for OAuth prompt preservation | VERIFIED | 16 lines, all 3 exports present with SSR guard |
| `tailwind.config.ts` | Font + color design system tokens | VERIFIED | fontFamily (sans/serif/logo), colors (navy/coral/umber/sky), backgroundImage |
| `src/app/layout.tsx` | 3-font CSS variable setup on `<html>` | VERIFIED | Inter, DM_Serif_Display, Abril_Fatface all imported with variable mode |
| `src/app/globals.css` | html height:100%, body margin:0 | VERIFIED | Both present — ensures h-screen works on all browsers |
| `src/app/page.tsx` | Landing page (not redirect) | VERIFIED | 33 lines — nav, VideoHero, HowItWorks, DestinationCards |
| `src/components/landing/VideoHero.tsx` | Full-viewport video hero with motion entrance | VERIFIED | 80 lines, `<video autoPlay muted loop playsInline preload="none">`, stagger animation, gradient overlay, scroll hint |
| `src/components/landing/HeroInput.tsx` | Auth gate logic (handleGo) | VERIFIED | 55 lines, checks `supabase.auth.getUser()`, branches authenticated/unauthenticated, calls `savePrompt` + `signInWithOAuth` |
| `src/components/landing/QuickChips.tsx` | 5 quick-pick chips that fill input | VERIFIED | 38 lines, 5 CHIPS entries, calls `onSelect(chip.prompt)`, passes `active` state to Chip |
| `src/components/landing/HowItWorks.tsx` | 3-step section with scroll animations | VERIFIED | 70 lines, `whileInView` stagger, `text-coral` numbered steps |
| `src/components/landing/DestinationCards.tsx` | 3-card destination grid with scroll animations | VERIFIED | 119 lines, stagger cardItem animations, value prop CTA with `bg-navy` |
| `middleware.ts` | Public path includes / | VERIFIED | `pathname === '/'` exact match in isPublicPath |
| `src/app/auth/callback/route.ts` | ?next= param support | VERIFIED | Reads `next`, enforces relative-only, redirects correctly |
| `src/app/(authenticated)/chat/layout.tsx` | Full-viewport fixed overlay for chat | VERIFIED | `fixed inset-0 z-30 bg-white` — clears parent max-w-6xl and nav |
| `src/components/chat/SplitLayout.tsx` | CSS grid 50/50 split | VERIFIED | `grid grid-cols-2 h-screen overflow-hidden`, left: border-r, right: bg-gray-950 |
| `src/components/chat/ContextPanel.tsx` | AnimatePresence ambient-to-itinerary transition | VERIFIED | AmbientPanel (ambient images + "Understanding your trip..."), ItineraryPanel (title, days, activities), AnimatePresence mode="wait" |
| `src/components/chat/QuickActionChips.tsx` | 3 light-themed chat quick-reply chips | VERIFIED | Returns null when disabled, 3 QUICK_ACTIONS entries, light border style for white chat panel |
| `src/components/chat/BottomTabBar.tsx` | Tab bar with Itinerary active, Flights/Hotels disabled | VERIFIED | 3 tabs, Itinerary has `border-t-2`, Flights/Hotels have `opacity-40 cursor-not-allowed` |
| `src/__tests__/chip.test.tsx` | 4 real tests | VERIFIED | Tests button role, onClick, active styles, inactive styles |
| `src/__tests__/video-hero.test.tsx` | 5 real tests (replaced from stub) | VERIFIED | Tests video element, autoPlay/muted/loop/playsInline, preload="none", webm+mp4 sources, gradient overlay |
| `src/__tests__/landing-auth-gate.test.tsx` | 3 real tests (replaced from stub) | VERIFIED | Tests button renders, disabled on empty input, signInWithOAuth called with correct redirectTo |
| `src/__tests__/split-layout.test.tsx` | 3 real tests (replaced from stub) | VERIFIED | Tests left+right children render, grid-cols-2, h-screen |
| `src/__tests__/context-panel.test.tsx` | 3 real tests (replaced from stub) | VERIFIED | Tests ambient panel (null itineraryData), generating state, itinerary panel |
| `src/__tests__/quick-action-chips.test.tsx` | 4 real tests (replaced from stub) | VERIFIED | Tests 3 chips render, returns null when disabled, onSend calls |
| `public/images/hero-poster.jpg` | Video poster fallback | VERIFIED | File exists at `public/images/hero-poster.jpg` |
| `public/images/destinations/iceland.jpg` | Iceland destination card image | VERIFIED | File exists |
| `public/images/destinations/maldives.jpg` | Maldives destination card image | VERIFIED | File exists |
| `public/images/destinations/kyoto.jpg` | Kyoto destination card image | VERIFIED | File exists |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware.ts isPublicPath` | `src/app/page.tsx` | `pathname === '/'` | WIRED | Exact match present line 33 |
| `src/app/auth/callback/route.ts` | `/chat?q=<prompt>` | `searchParams.get('next')` | WIRED | `next` read line 7, relative-only enforced line 10 |
| `HeroInput.tsx handleGo` | `supabase.auth.signInWithOAuth` | `createClient()` from `lib/supabase/client` | WIRED | Called in unauthenticated branch with `redirectTo: /auth/callback?next=/chat?q=...` |
| `handleGo` | `savePrompt` | `import { savePrompt }` | WIRED | savePrompt(prompt) called before signInWithOAuth |
| `VideoHero.tsx` | `HeroInput + QuickChips` | shared `inputValue` state | WIRED | `useState('')` in VideoHero, passed as `value={inputValue}` to HeroInput and `onSelect={setInputValue}` to QuickChips |
| `chat/layout.tsx` | full-viewport override | `fixed inset-0 z-30` | WIRED | Confirmed z-30 (raised from z-10 in Plan 05 polish pass) |
| `ContextPanel.tsx` | `AnimatePresence` from motion/react | `import { AnimatePresence, motion } from 'motion/react'` | WIRED | mode="wait" wrapping conditional ambient/itinerary panels |
| `chat/page.tsx` | `useSearchParams` for ?q= | `import { useSearchParams } from 'next/navigation'` | WIRED | `searchParams.get('q')` line 32, wrapped in Suspense boundary |
| `SplitLayout.tsx` | chat/page.tsx | `import { SplitLayout }` | WIRED | Used in `return <SplitLayout left={leftPanel} right={rightPanel} />` |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UI-01 | 07-01, 07-03, 07-05 | Landing page with video background hero | SATISFIED | `VideoHero.tsx` — `<video autoPlay muted loop playsInline preload="none">`, bg-slate-900 fallback, gradient overlay |
| UI-02 | 07-01, 07-03, 07-05 | Centered headline + AI chat input on hero | SATISFIED | `VideoHero.tsx` — `font-serif text-5xl md:text-7xl` headline, GlassInput centered with `flex justify-center`, stagger motion entrance |
| UI-03 | 07-01, 07-03 | Quick-pick chip row (5 chips) | SATISFIED | `QuickChips.tsx` — 5 CHIPS array (Going solo, Family trip, Romantic escape, Group adventure, Weekend getaway), Chip component used |
| UI-04 | 07-02, 07-03, 07-05 | Minimal nav (logo left, sign in right) | SATISFIED | `src/app/page.tsx` — nav with `font-logo` "Barabula." and "Sign in" link; middleware allows unauthenticated access |
| UI-05 | 07-02, 07-03 | Auth gate: type freely → Go → OAuth → /chat?q= | SATISFIED | `HeroInput.tsx` — `savePrompt` + `signInWithOAuth` with `redirectTo: /auth/callback?next=/chat?q=...`; auth/callback reads `next` param |
| UI-06 | 07-03 | Scroll sections: how it works + destination cards | SATISFIED | `HowItWorks.tsx` + `DestinationCards.tsx` — both use `whileInView` stagger animations with `viewport: { once: true }` |
| UI-07 | 07-01, 07-04, 07-05 | /chat 50/50 split layout | SATISFIED | `SplitLayout.tsx` — `grid grid-cols-2 h-screen`; `chat/layout.tsx` — `fixed inset-0 z-30` overrides parent max-w-6xl |
| UI-08 | 07-04 | Right panel Phase 1: destination photo + "Understanding..." | SATISFIED | `ContextPanel.tsx` AmbientPanel — Unsplash ambient image at `opacity-40`, "Understanding your trip..." text, "Building your itinerary..." when isGenerating |
| UI-09 | 07-04 | Right panel Phase 2: smooth transition to itinerary view | SATISFIED | `ContextPanel.tsx` — AnimatePresence mode="wait"; ambient exits `scale:0.98 opacity:0`, itinerary enters `y:20 opacity:0` over 0.5s ease |
| UI-10 | 07-04 | Quick-action chips in chat (Looks good, Change dates, Add a budget) | SATISFIED | `QuickActionChips.tsx` — 3 QUICK_ACTIONS, light-themed buttons, onSend wired to chat/page.tsx sendMessage |
| UI-11 | 07-04 | Bottom nav bar stub (Itinerary active, Flights/Hotels disabled) | SATISFIED | `BottomTabBar.tsx` — Itinerary `border-t-2 border-gray-900`, Flights/Hotels `opacity-40 cursor-not-allowed` |
| UI-12 | 07-01, 07-05 | Typography and color system | SATISFIED | `tailwind.config.ts` — font-sans (Inter), font-serif (DM Serif Display), font-logo (Abril Fatface), navy/coral/umber/sky tokens; CSS variable chain on `<html>` |
| UI-13 | 07-04, 07-05 | Chat page = full-bleed, no max-w-6xl | SATISFIED | `chat/layout.tsx` — `fixed inset-0 z-30` breaks out of parent `max-w-6xl mx-auto px-4 py-8` container |

**Note on requirement traceability:** UI-01 through UI-13 are defined in `07-RESEARCH.md` as phase-specific requirements. They do not appear in the project-level `REQUIREMENTS.md` (which only covers through Phase 6). This is expected — Phase 7 was added as an insertion to the roadmap after the initial requirements document was finalized. The traceability table in REQUIREMENTS.md also does not include Phase 7 entries, which is consistent.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/landing/VideoHero.tsx` | 28 | `{/* poster: TODO replace with real destination image if needed */}` | Info | Non-blocking — `public/images/hero-poster.jpg` does exist (confirmed in filesystem). This is a stale comment, not an actual issue. |

No blocker or warning anti-patterns found. No empty implementations, no placeholder returns, no console.log-only handlers.

---

## Human Verification Required

### 1. Landing Page Video Hero

**Test:** Run `npm run dev`, visit http://localhost:3000 without being logged in.
**Expected:** Full-viewport dark background (video or bg-slate-900 fallback), "Where to next?" headline in DM Serif Display serif font, glassmorphism input bar (blurred, semi-transparent), 5 chip pills below, hero entrance animation plays (fade + slide up from below). Nav shows "Barabula." in Abril Fatface left, "Sign in" right.
**Why human:** Video autoplay behavior, font rendering quality, and animation timing require a live browser.

### 2. Landing Page Scroll Sections

**Test:** Scroll below the hero on http://localhost:3000.
**Expected:** "How it works" section fades in with 3 steps numbered in coral (#D67940) using large DM Serif Display numerals. Destination cards (Iceland, Maldives, Kyoto) stagger in with scale animations. Value prop box at bottom with "Create a new trip →" button in navy.
**Why human:** whileInView scroll-triggered animations require IntersectionObserver in a browser.

### 3. Quick Chip Fills Input

**Test:** On the landing page, click "Romantic escape" chip.
**Expected:** The GlassInput bar fills with the romantic getaway prompt text. Chip becomes active/selected (white background vs translucent inactive state).
**Why human:** Requires browser interaction to test lifted state between QuickChips and HeroInput.

### 4. Auth Gate — Unauthenticated User

**Test:** Type a trip description in the landing input bar, click "Plan trip" while not logged in.
**Expected:** Google OAuth redirect initiates (browser navigates toward Google sign-in). The prompt was saved to sessionStorage before redirect.
**Why human:** OAuth redirect requires a real browser session; sessionStorage cannot be tested from the command line.

### 5. Chat Split Layout and Nav Override

**Test:** Log in and visit http://localhost:3000/chat.
**Expected:** Full-viewport 50/50 grid — left white chat panel, right dark ambient panel (bg-gray-950) with a subtle travel image and "Tell me about your perfect trip" text. No max-width constraint (fills full browser width). Authenticated nav is NOT visible (covered by z-30 fixed overlay). Bottom tab bar shows Itinerary active, Flights/Hotels faded.
**Why human:** CSS z-index stacking context must be verified visually to confirm nav is covered.

### 6. Right Panel Transition

**Test:** Log in, visit /chat, have a conversation where the AI generates a full itinerary.
**Expected:** Right panel smoothly fades from ambient photo state to the itinerary summary card (title, destination, days/activities stats, date range). After 2.5 seconds, page navigates to /itinerary/[id].
**Why human:** AnimatePresence transition requires a live AI conversation to trigger itineraryData state change.

### 7. Design Quality

**Test:** Evaluate the landing page and chat page against the design brief.
**Expected:** DM Serif Display renders for all headlines (not Georgia fallback). Abril Fatface renders for "Barabula." logo. Coral accent color appears on How It Works step numbers and hover states. The overall feel is premium and travel-inspired — not generic developer scaffold.
**Why human:** Font rendering quality and subjective design judgment require visual inspection.

---

## Commit Verification

All commits documented in SUMMARYs confirmed in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `8dec5b6` | 07-01 | Install motion, add fonts, extend Tailwind |
| `63d4ebb` | 07-01 | Create Chip, GlassInput, prompt-store, test scaffolds |
| `5c1bf6b` | 07-02 | Add / to public paths in middleware |
| `bed8695` | 07-03 | Build landing page components |
| `42fbd35` | 07-03 | Fix cubic bezier type annotation |
| `ddc66f3` | 07-04 | Build SplitLayout, ContextPanel, chat layout override |
| `8cfd413` | 07-04 | Build QuickActionChips, BottomTabBar, split-panel chat page |
| `2090cbb` | 07-05 | Audit and fix layout pitfalls (z-30, html height:100%) |

---

## Summary

Phase 7 goal achievement is confirmed for all 13 automated requirements. Every artifact exists and is fully implemented (not stubbed). All key wiring connections are in place:

- The design system foundation (motion, DM Serif Display, Abril Fatface, brand palette) is fully established in `tailwind.config.ts` and `layout.tsx`.
- The landing page is a real page with a video hero, glassmorphism input, 5 quick-pick chips, How It Works section, and destination cards — not a redirect.
- The auth gate correctly routes unauthenticated users through Google OAuth and preserves the trip prompt via both sessionStorage and ?q= query param.
- The middleware correctly allows unauthenticated access to `/` while protecting all other routes.
- The chat page is a full-viewport 50/50 split with a dark ambient right panel that transitions to an itinerary summary via AnimatePresence.
- The chat layout override (`fixed inset-0 z-30`) correctly escapes the authenticated layout's max-w-6xl container.
- All 6 test stub files were replaced with real tests; total test suite is 55 tests.

The 7 human verification items are visual/interactive checks that cannot be performed programmatically. All automated evidence points to these working correctly — the remaining uncertainty is purely visual fidelity and browser behavior.

---

_Verified: 2026-03-11_
_Verifier: Claude (gsd-verifier)_
