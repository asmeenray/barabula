# Phase 12: Mobile Responsive Web — Research

**Researched:** 2026-03-12
**Domain:** Mobile responsive web layout, Tailwind breakpoints, viewport height, FAB patterns, loading overlays
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Mobile = `< 768px` (Tailwind `md` breakpoint). Below this: single-column full-screen chat, ContextPanel hidden. At/above: desktop split layout unchanged.
- Chat is full-screen on mobile — no separate nav bar visible. Barabula. logo + "AI Trip Planner" label stay in the chat header.
- ContextPanel not rendered on mobile — right panel simply absent (not collapsed, not shifted off-screen).
- Drag handle also hidden on mobile.
- Auto-navigate to `/itinerary/:id` immediately when itinerary generation completes on mobile — no Accept step.
- Before navigating, show a brief full-screen overlay: "Building your itinerary..." with a coral spinner for ~1-2s.
- After landing on the itinerary page, show a mobile-only floating "Chat again" button (FAB, `md:hidden`) that navigates to `/chat`.
- No extra progress UI during gathering phase — just chat and typing indicator dots.
- No separate trip state summary UI — AI reflects state in chat messages.
- No itinerary preview card in chat thread — auto-navigation replaces it.
- Typing indicator dots sufficient even during itinerary generation.
- Bottom tab bar (Flights/Hotels) stays at bottom of chat, same as desktop — no logic changes, only scroll/overflow sizing for small screens.
- Tabs only visible during `itinerary_complete` phase, same rule as desktop (note: code shows `PHASE_SHOWS_TABS = ['gathering_details', 'ready_for_summary']` — verify against current logic).
- Tab panels should be scrollable and appropriately sized for small screens.
- Standard tap interactions only — no custom swipe gestures.
- Native browser scroll.
- Landing page stays identical on mobile — not in scope.
- Itinerary page itself is not redesigned — only the "Chat again" FAB is added.

### Claude's Discretion

- Exact implementation of the "Building your itinerary..." overlay (animation, duration, dismiss logic).
- Exact placement and style of the "Chat again" FAB on the itinerary page (mobile only).
- How to conditionally render/hide the right panel and drag handle via Tailwind responsive classes.
- Tab panel overflow/scroll handling for small screen heights.

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 12 is a surgical responsive polish phase. The codebase is already structured for this: `SplitLayout.tsx` uses inline percentage widths and `chat/page.tsx` passes `left` and `right` panels separately — making it straightforward to hide the right panel and drag handle below `md` breakpoint using Tailwind responsive classes without logic changes.

The three new UI elements to build are: (1) mobile responsive SplitLayout that shows only the left panel at `< 768px`, (2) a "Building your itinerary..." full-screen overlay using the already-installed `motion/react` library, and (3) a mobile-only "Chat again" FAB on the itinerary detail page. The key technical risks are viewport height instability on iOS Safari (solved by `100dvh`), keyboard-caused layout jumps on mobile chat input, and the overlay timing sequence (show overlay → wait ~1-1.5s → `router.push()`).

**Primary recommendation:** Use Tailwind responsive prefixes (`hidden md:flex`, `md:block`) to hide the right panel and drag handle. Keep all logic in `SplitLayout.tsx` and `chat/page.tsx` minimal. Implement the overlay as a `fixed inset-0` `motion.div` with `z-50` rendered inside `ChatPageInner`, and navigate after a `setTimeout` of ~1200ms. Add the FAB as a `fixed bottom-6 right-6 z-40 md:hidden` button in `itinerary/[id]/page.tsx`.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v3 (project standard) | Responsive breakpoint classes (`hidden md:flex`, `md:block`) | Zero-cost responsive, already configured |
| motion/react | 12.35.2 (installed) | Overlay entrance/exit animation, FAB animation | Already used throughout codebase, `AnimatePresence` pattern established |
| Next.js useRouter | App Router (`next/navigation`) | `router.push()` after overlay timer | Already imported in `ContextPanel.tsx` and `itinerary/[id]/page.tsx` |

### No New Dependencies Required
All required tools are already installed. This phase adds zero new packages.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended File Changes
```
src/
├── components/chat/
│   └── SplitLayout.tsx          # Add md:hidden to drag handle + right panel wrapper
├── app/(authenticated)/chat/
│   └── page.tsx                 # Add overlay state + mobile auto-nav logic
└── app/(authenticated)/itinerary/[id]/
    └── page.tsx                 # Add "Chat again" FAB (md:hidden)
```

### Pattern 1: Hiding Right Panel with Tailwind Responsive Classes

**What:** Use `hidden md:flex` on the right panel wrapper and drag handle inside `SplitLayout.tsx` so they disappear below the `md` (768px) breakpoint. Left panel takes `w-full` on mobile.

**When to use:** Any element that only belongs in the desktop split view.

**How SplitLayout currently works:**
- Container: `flex h-full overflow-hidden` — stays as-is
- Left panel: inline `style={{ width: '${leftPct}%' }}` — must become `w-full` on mobile
- Drag handle: `w-1.5 h-full cursor-col-resize` — add `hidden md:flex` to hide on mobile
- Right panel: inline `style={{ width: '...' }}` — add `hidden md:relative` wrapper

**Example approach:**
```tsx
// SplitLayout.tsx — mobile responsive pattern
<div ref={containerRef} className="flex h-full overflow-hidden" data-testid="split-layout">
  {/* Left panel — full width on mobile, percentage on desktop */}
  <div
    className="flex flex-col h-full overflow-hidden w-full md:w-auto"
    style={{ width: undefined }} // remove inline width on mobile via class override
  >
    {left}
  </div>

  {/* Drag handle — hidden on mobile */}
  <div className="hidden md:flex group relative shrink-0 w-1.5 h-full cursor-col-resize items-center justify-center hover:w-2 transition-all duration-150"
    onMouseDown={startDrag}
  >
    ...
  </div>

  {/* Right panel — hidden on mobile */}
  <div className="hidden md:relative md:block h-full overflow-hidden bg-gray-950"
    style={{ width: `${100 - leftPct - 0.375}%` }}
  >
    {right}
  </div>
</div>
```

**Important:** Inline `style` width still applies to hidden elements in some browsers. Safest approach is to conditionally apply the inline style using a `useMediaQuery` hook OR simply wrap right panel + drag handle in a `hidden md:flex` parent div that takes `${100-leftPct}%` width on desktop.

**Cleaner alternative using a wrapper div:**
```tsx
{/* Right section (drag + panel) — hidden on mobile, flex on desktop */}
<div className="hidden md:flex h-full" style={{ width: `${100 - leftPct - 0.375}%` }}>
  {/* Drag handle */}
  <div className="..." onMouseDown={startDrag}>...</div>
  {/* Panel */}
  <div className="relative h-full overflow-hidden bg-gray-950 flex-1">{right}</div>
</div>
```
This is cleaner — one `hidden md:flex` controls both drag handle and right panel, and the inline width is applied to the wrapper not the children.

When the wrapper is hidden, left panel should fill remaining width. Solution: add `flex-1` to the left panel div — it will fill 100% of the flex container width when the right section is hidden.

### Pattern 2: "Building Your Itinerary..." Overlay

**What:** Full-screen `fixed inset-0 z-50` overlay rendered inside `ChatPageInner`, controlled by a `showOverlay` boolean state. On mobile, when `data.itineraryId` is received, show the overlay, then call `router.push()` after ~1200ms.

**When to use:** Mobile only — detect with `window.innerWidth < 768` or a `useMediaQuery` hook at the moment of navigation decision.

**Animation pattern (uses already-installed motion/react):**
```tsx
// Inside ChatPageInner — new state
const [showOverlay, setShowOverlay] = useState(false)
const router = useRouter()

// Inside callApi, when data.itineraryId is set:
const isMobile = window.innerWidth < 768
if (isMobile) {
  setShowOverlay(true)
  setTimeout(() => {
    router.push(`/itinerary/${data.itineraryId}`)
  }, 1200)
  // Don't set setSending(false) yet — overlay dismisses on navigate
} else {
  // existing desktop behavior (fullItinerary + Accept button)
}

// Overlay JSX — inside return, wrapped in AnimatePresence:
<AnimatePresence>
  {showOverlay && (
    <motion.div
      key="building-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sand"
    >
      {/* Coral spinner */}
      <div className="w-10 h-10 rounded-full border-2 border-coral/20 border-t-coral animate-spin mb-6" />
      <p className="font-serif text-xl text-navy mb-2">Building your itinerary...</p>
      <p className="text-sm text-umber/60">Just a moment</p>
    </motion.div>
  )}
</AnimatePresence>
```

**Duration rationale:** 1200ms (1.2s) is a "breathing room" feel — not so short it feels like a flash, not so long it feels like a hang. The overlay should ideally show after `setSending(false)` is NOT called yet — the AI has already responded, we're just giving the user a moment to register the success.

**Background color:** `bg-sand` (warm, on-brand) or `bg-white` — not a dark overlay since this is a celebratory transition. Avoid black/gray which feels like an error state.

**Exit:** The overlay doesn't need a complex exit — the page navigation itself replaces it. No `exit` animation is critical; a simple fade-out from `AnimatePresence` is fine.

### Pattern 3: "Chat Again" FAB on Itinerary Page

**What:** `md:hidden` floating button, bottom-right corner, coral colored, navigates to `/chat`. Visible only on mobile (below 768px).

**Placement:** `fixed bottom-6 right-5 z-40 md:hidden` — bottom-right is the conventional FAB position per Material Design and Apple HIG. Bottom-right clears content and thumbs reach it naturally.

**Conflict check:** The itinerary page already has a `fixed bottom-6 left-1/2` share toast and `fixed bottom-0 left-0 right-0` CTA banner (share mode only). The FAB at `bottom-6 right-5` doesn't conflict with these. On share mode pages, add `bottom-[88px] right-5` to clear the CTA banner height.

**Minimum tap target:** 48px × 48px minimum (Apple/Google standard; WCAG 2.2 requires 24×24 minimum, but 44×44 is HIG best practice). Use `w-12 h-12` (48px) or pill shape `px-4 py-3` which gives at minimum 44px height.

**Example implementation:**
```tsx
// In itinerary/[id]/page.tsx — after other fixed elements
<button
  onClick={() => router.push('/chat')}
  className="fixed bottom-6 right-5 z-40 md:hidden flex items-center gap-2 bg-coral text-white text-sm font-semibold rounded-full px-4 py-3 shadow-lg active:scale-95 transition-transform"
  style={{ boxShadow: '0 4px 16px rgba(214,121,64,0.35)' }}
>
  {/* Chat icon — inline SVG, no lucide-react */}
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  Chat again
</button>
```

**On share mode conflict:** When `isShareMode && ctaBannerVisible` is true, the CTA banner is ~88px tall. Apply `bottom-[104px]` in share mode to clear it, or use `bottom-[calc(env(safe-area-inset-bottom,0px)_+_6rem)]`. Simpler: check `isShareMode` and use a conditional class.

### Pattern 4: Viewport Height — 100dvh

**What:** `h-screen` in Tailwind maps to `height: 100vh`. On iOS Safari, `100vh` = the full viewport including the browser chrome, which causes elements at the bottom to be clipped when the address bar is visible.

**Current state:** The chat layout uses `fixed inset-0 z-30` — this sidesteps the `h-screen` problem for the main chat container since `inset-0` = `top:0 right:0 bottom:0 left:0`, not viewport height units. However, child flex containers inside use `h-full`.

**Risk:** `100vh` can cause clipping. `100dvh` resolves this by tracking the dynamic viewport (what the user sees, minus Chrome). But `100dvh` is supported in Safari 15.4+ (2022) — well within safe support range.

**Recommendation:** No immediate change needed for the chat container (it uses `fixed inset-0` which is safe). For the overlay element (`fixed inset-0`), same pattern — safe. The itinerary page uses `h-full flex-col overflow-hidden` descending from the layout — also safe since it's sized by the authenticated layout, not viewport units directly.

**Safe area insets for FAB:** The "Chat again" FAB needs `padding-bottom: env(safe-area-inset-bottom)` on iPhone X+ (notch/home indicator devices). Use:
```css
/* In globals.css or as inline style */
bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))
```
Or as a Tailwind inline style since Tailwind has no built-in `env()` support for arbitrary safe-area values.

**Enabling env() safe area:** Requires `<meta name="viewport" content="viewport-fit=cover">` in the `<head>`. Check if this is already set in the Next.js layout.

### Pattern 5: Keyboard Behavior on Mobile Chat

**What:** When the user taps the `ChatInput` textarea on mobile, the virtual keyboard appears and pushes content up. Without careful layout handling, the send button or input can disappear behind the keyboard.

**Current structure:** Chat uses `fixed inset-0` → `flex flex-col h-full`. The input area is at the bottom (`shrink-0`). When the keyboard opens on iOS, the browser resizes the visual viewport but NOT `window.innerHeight` consistently.

**Modern solution:** `100dvh` + browser's native keyboard avoidance. iOS Safari 15.4+ and Chrome on Android handle keyboard resize reasonably for `fixed` elements — the viewport shrinks to exclude the keyboard.

**Practical recommendation:** No custom VirtualKeyboard API needed for this app. The existing `fixed inset-0` layout should behave correctly on modern iOS/Android. Test on physical device. If the input gets covered: add `padding-bottom: env(keyboard-inset-height, 0px)` as a CSS fallback (Chrome Android only, not Safari). Safari relies on the native resize behavior.

**Tab panels overflow:** The `FlightsTabPanel` and `HotelsTabPanel` slide up as `motion.div` elements in the left panel. On small screen heights (iPhone SE: 667px), these panels could be taller than available space. They already have `shrink-0` which means they DON'T shrink. Fix: add `max-h-[50vh] overflow-y-auto` to the panel content wrapper, or limit the panel height in the component. This is Claude's discretion per CONTEXT.md.

### Anti-Patterns to Avoid
- **Conditional rendering for mobile vs desktop:** Don't render `{isMobile ? <MobileChat /> : <DesktopChat />}`. Use CSS `hidden md:flex` — cheaper, no hydration mismatch risk.
- **Using `window.innerWidth` for render logic:** Causes hydration mismatch in Next.js SSR. Use CSS-only for layout, `window.innerWidth` only for imperative logic (like the mobile auto-navigation decision inside `callApi`).
- **Hard-coding `100vh` in overlay:** Use `fixed inset-0` instead of `h-[100vh]` — `inset-0` is equivalent and avoids iOS Safari height bugs.
- **Animating `display: none`:** Tailwind `hidden` sets `display: none`. Don't try to animate into/out of `hidden` — use `opacity` + `pointer-events-none` for fade-in-out if needed, or rely on CSS `hidden md:flex` without animation for the panel hide.
- **z-index conflicts:** Chat layout is `z-30`. Overlay must be `z-50` to appear above everything. FAB on itinerary page is `z-40`. The itinerary page's share banner is `z-40` — FAB at `z-40` on the same page requires positional awareness (FAB at bottom-right, banner at bottom-center, no overlap).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile hide/show logic | Custom JS media query state | Tailwind `hidden md:flex` classes | No JS, no hydration mismatch, instant |
| Overlay animation | Custom CSS keyframes | `motion.div` with `initial/animate/exit` | Already installed, consistent with rest of app |
| FAB shadow | Custom box-shadow calculation | Inline `boxShadow: '0 4px 16px rgba(214,121,64,0.35)'` | Matches existing share-toast pattern in codebase |
| Safe area padding | Custom JS detection | CSS `env(safe-area-inset-bottom, 0px)` | Native browser API, zero overhead |

**Key insight:** Everything needed already exists. The code changes are additive (new state + overlay JSX) and subtractive (adding `hidden md:flex` to existing elements). No new libraries.

---

## Common Pitfalls

### Pitfall 1: SplitLayout inline `style` width still applied when hidden
**What goes wrong:** The right panel has `style={{ width: '...' }}`. Even with `hidden`, some browsers may still allocate space for hidden flex children in certain layout contexts.
**Why it happens:** `hidden` = `display: none`, which fully removes from layout flow. This is actually correct — `display: none` elements take no space. The inline style is irrelevant when `display: none`.
**How to avoid:** Wrap both drag handle AND right panel in a single `hidden md:flex` parent that carries the inline width. Left panel gets `flex-1` so it fills remaining space (which is 100% when wrapper is hidden).
**Warning signs:** Right panel taking up invisible space, left panel not filling full width on mobile.

### Pitfall 2: Existing split-layout.test.tsx will fail
**What goes wrong:** The existing test at line 17 checks for `grid-cols-2` class, and line 26 checks for `h-screen` — neither of which exists in the current `SplitLayout.tsx` (it uses `flex h-full`, not grid). These tests already fail against current code (stale tests from an earlier version).
**Why it happens:** Tests were written against a planned version before implementation changed.
**How to avoid:** Update `split-layout.test.tsx` to match actual classes (`flex h-full`). When adding responsive classes, update tests to check for the new behavior (e.g., right panel has `hidden md:block`).
**Warning signs:** Test run shows "does not contain 'grid-cols-2'" failures.

### Pitfall 3: Mobile auto-navigation firing on desktop
**What goes wrong:** `window.innerWidth < 768` check inside `callApi` fires at desktop width when tested in browser dev tools at wrong viewport.
**Why it happens:** Dev testing at wrong viewport, or component re-renders changing width.
**How to avoid:** The `window.innerWidth` check is correct but should only be used as an imperative trigger inside `callApi`, not as render state. The test: `if (typeof window !== 'undefined' && window.innerWidth < 768)`.
**Warning signs:** Desktop users see overlay and get auto-navigated without Accept button.

### Pitfall 4: Overlay `router.push` races with `setSending(false)`
**What goes wrong:** `setSending(false)` is called while the overlay is showing, causing a flash of the "normal" state before navigation.
**Why it happens:** `callApi` currently calls `setSending(false)` in both the `if (data.itineraryId)` and `else` branches.
**How to avoid:** On mobile, don't call `setSending(false)` — let the overlay + navigation handle it. The component unmounts on navigation anyway.
**Warning signs:** Brief flash of the normal chat state between overlay and navigation.

### Pitfall 5: FAB obscures content on share mode itinerary
**What goes wrong:** "Chat again" FAB (bottom-right) overlaps the CTA acquisition banner (bottom-full-width) in share mode.
**Why it happens:** Both are `fixed` positioned at the bottom.
**How to avoid:** Conditionally increase FAB bottom position in share mode. When `isShareMode && ctaBannerVisible`, push FAB above the banner (~88-96px up). Use a ternary on the `className`.
**Warning signs:** FAB visible but partially behind banner on shared itinerary pages on mobile.

### Pitfall 6: Tab panels too tall on small screens
**What goes wrong:** `FlightsTabPanel` / `HotelsTabPanel` are `shrink-0` — they don't compress on small viewports. On iPhone SE (375×667), an expanded panel + BottomTabBar + ChatInput + header might overflow the container.
**Why it happens:** `shrink-0` prevents flex shrinking, and the panel has no max-height constraint.
**How to avoid:** Add `max-h-[40vh] overflow-y-auto` to the inner scrollable content of both tab panels. This caps them at 40% viewport height.
**Warning signs:** Input field or BottomTabBar gets pushed out of view when a tab panel is open on small screens.

---

## Code Examples

### Responsive SplitLayout — wrapper approach
```tsx
// Source: Tailwind responsive design docs + codebase analysis
// Wrap drag handle + right panel in a single hidden md:flex container
<div
  className="hidden md:flex h-full"
  style={{ width: `${100 - leftPct - 0.375}%` }}
>
  {/* Drag handle */}
  <div
    className="group relative shrink-0 w-1.5 h-full cursor-col-resize flex items-center justify-center hover:w-2 transition-all duration-150"
    onMouseDown={startDrag}
  >
    <div className="absolute inset-y-0 w-px bg-sand-dark/50 group-hover:bg-coral/30 transition-colors" />
    <div className="relative z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="w-1 h-1 rounded-full bg-coral/50" />
      ))}
    </div>
  </div>
  {/* Right panel */}
  <div className="relative flex-1 h-full overflow-hidden bg-gray-950">
    {right}
  </div>
</div>
```

### Mobile overlay in ChatPageInner
```tsx
// Source: motion/react AnimatePresence docs + existing codebase patterns
// State: const [showMobileOverlay, setShowMobileOverlay] = useState(false)
// Add useRouter import (already in ContextPanel.tsx pattern, add to chat/page.tsx)

<AnimatePresence>
  {showMobileOverlay && (
    <motion.div
      key="mobile-nav-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sand"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-10 h-10 rounded-full border-2 border-coral/20 border-t-coral animate-spin" />
        <div className="text-center">
          <p className="font-serif text-xl text-navy mb-1">Building your itinerary...</p>
          <p className="text-sm text-umber/60">Crafting every detail</p>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### Mobile auto-navigation logic in callApi
```tsx
// Source: codebase analysis — integration point in callApi
if (data.itineraryId) {
  // ... existing fetch of fullItinerary ...
  setMessages(prev => [...prev, aiMsg])
  setSending(false)

  // Mobile: overlay + auto-navigate. Desktop: show FullItineraryPanel with Accept button.
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    setShowMobileOverlay(true)
    setTimeout(() => {
      router.push(`/itinerary/${data.itineraryId}`)
    }, 1200)
  }
  // Desktop does nothing extra here — FullItineraryPanel renders via setFullItinerary
}
```

### "Chat again" FAB on itinerary page
```tsx
// Source: codebase analysis — add to itinerary/[id]/page.tsx return
// Position: after the share toast, before the closing </div>
// md:hidden ensures desktop never sees this

{/* "Chat again" FAB — mobile only */}
<button
  onClick={() => router.push('/chat')}
  className={[
    'fixed z-40 md:hidden',
    'flex items-center gap-2',
    'bg-coral text-white text-sm font-semibold rounded-full px-4 py-3',
    'active:scale-95 transition-transform duration-100',
    // Adjust position if CTA banner is visible (share mode)
    isShareMode && ctaBannerVisible ? 'bottom-[96px] right-5' : 'bottom-6 right-5',
  ].join(' ')}
  style={{ boxShadow: '0 4px 16px rgba(214,121,64,0.35)' }}
  aria-label="Chat again to refine your trip"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  Chat again
</button>
```

### Safe area inset for FAB (iOS notch/home indicator)
```tsx
// Inline style approach — Tailwind doesn't support env() out of the box
style={{
  boxShadow: '0 4px 16px rgba(214,121,64,0.35)',
  bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
}}
```
This requires `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` in the layout.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` for full-screen | `100dvh` (dynamic viewport) | Safari 15.4 (2022), Chrome 108 (2022) | Eliminates iOS address-bar height jump |
| `window.innerWidth` for responsive logic | CSS-only with `hidden md:flex` | Always best practice | No hydration mismatch in Next.js SSR |
| Custom scroll-to-top on navigation | `router.push()` handles scroll | Next.js App Router default | Correct behavior without extra code |
| `framer-motion` package | `motion/react` (rebranded) | Motion v11+ (2024) | Already installed as `motion@12.35.2` — import from `motion/react` |

**Deprecated/outdated:**
- `next/router` useRouter: replaced by `next/navigation` useRouter in App Router — already using correct version throughout codebase.
- `-webkit-fill-available` height hack: superseded by `100dvh` for modern browsers (2022+).

---

## Open Questions

1. **`viewport-fit=cover` already set?**
   - What we know: The Next.js layout file wasn't read during research
   - What's unclear: Whether `viewport-fit=cover` is present in the `<meta viewport>` tag
   - Recommendation: Read `src/app/(authenticated)/layout.tsx` and root `src/app/layout.tsx` during planning to verify. If not present, add it to enable `env(safe-area-inset-bottom)` for the FAB safe area.

2. **`BottomTabBar` phase logic mismatch**
   - What we know: `BottomTabBar.tsx` shows tabs during `['gathering_details', 'ready_for_summary']` phases. CONTEXT.md says "tabs only visible during `itinerary_complete` phase."
   - What's unclear: This is an existing behavior inconsistency that may have been intentional or may be stale. The CONTEXT.md statement may have been describing a desired future state.
   - Recommendation: Planner should confirm — leave BottomTabBar phase logic unchanged (per CONTEXT.md: "no changes needed to their logic").

3. **SplitLayout test stale**
   - What we know: `split-layout.test.tsx` tests for `grid-cols-2` and `h-screen` — neither exists in current `SplitLayout.tsx`.
   - What's unclear: Whether these tests are already failing in CI or marked as expected to fail.
   - Recommendation: Update tests as part of the SplitLayout responsive change plan. Tests for the new behavior should cover: right panel hidden on narrow viewport (hard to test in jsdom), left panel fills width.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react (jsdom) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run src/__tests__/split-layout.test.tsx src/__tests__/chat-page.test.tsx src/__tests__/itinerary-detail.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| SplitLayout hides right panel on mobile (new `hidden md:flex` wrapper) | unit | `npx vitest run src/__tests__/split-layout.test.tsx -t "hides right panel"` | ❌ Wave 0 — update existing test |
| SplitLayout left panel fills full width when right is hidden | unit | `npx vitest run src/__tests__/split-layout.test.tsx -t "left panel full width"` | ❌ Wave 0 — new test case |
| Mobile overlay renders when showMobileOverlay state is true | unit | `npx vitest run src/__tests__/chat-page.test.tsx -t "mobile overlay"` | ❌ Wave 0 — new test case |
| router.push called after itineraryId received (existing test, verify still passes) | unit | `npx vitest run src/__tests__/chat-page.test.tsx -t "router.push"` | ✅ Exists (verify it still covers mobile path) |
| Itinerary page renders FAB when not in desktop viewport | unit | `npx vitest run src/__tests__/itinerary-detail.test.tsx -t "chat again"` | ❌ Wave 0 — new test case |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/split-layout.test.tsx src/__tests__/chat-page.test.tsx src/__tests__/itinerary-detail.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update `src/__tests__/split-layout.test.tsx` — existing tests check for `grid-cols-2` and `h-screen` which don't exist in current code; update to reflect actual classes and add mobile-responsive assertions
- [ ] Add mobile overlay test cases to `src/__tests__/chat-page.test.tsx` — test that overlay shows when itinerary completes on narrow viewport
- [ ] Add FAB test case to `src/__tests__/itinerary-detail.test.tsx` — test that "Chat again" button renders with correct `md:hidden` class

---

## Sources

### Primary (HIGH confidence)
- Codebase direct analysis: `SplitLayout.tsx`, `chat/page.tsx`, `ContextPanel.tsx`, `itinerary/[id]/page.tsx`, `ChatInput.tsx`, `BottomTabBar.tsx`, `globals.css`, `tailwind.config.ts` — all read directly
- `12-CONTEXT.md` — locked decisions and implementation notes

### Secondary (MEDIUM confidence)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) — `hidden md:flex` pattern confirmed as standard approach
- [Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence) — overlay entrance/exit pattern confirmed
- [100dvh and iOS Safari fix](https://iifx.dev/en/articles/460170745/fixing-ios-safari-s-shifting-ui-with-dvh) — `100dvh` as modern solution confirmed
- [Safe area insets with env()](https://medium.com/@developerr.ayush/understanding-env-safe-area-insets-in-css-from-basics-to-react-and-tailwind-a0b65811a8ab) — `env(safe-area-inset-bottom)` pattern confirmed
- [WCAG touch target 44px](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) — 44×44px minimum confirmed

### Tertiary (LOW confidence)
- [Mindtrip.ai luxury UX analysis](https://resident.com/tech-and-gear/2025/10/29/ux-meets-luxury-the-art-of-itinerary-visualization-in-mindtripai) — qualitative design direction: "minimal, immersive, deliberate transitions, visual storytelling"

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, no new dependencies
- Architecture: HIGH — codebase fully read, exact integration points identified
- Pitfalls: HIGH — stale tests and mobile-specific risks identified from direct code analysis
- Viewport/safe area: MEDIUM — best practices confirmed from official docs, physical device testing still needed

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain, no fast-moving dependencies)
