# Phase 7 Context: UI Overhaul — Landing Page & Chatbot Redesign

## Goal
Redesign the frontend to match the layla.ai UX pattern: immersive landing with inline AI chat, Google Auth gate, and a split-panel chatbot that progressively collects trip details and reveals the itinerary.

## Design Decisions

### Landing Page
- **Background:** High-quality video loop cycling through destination footage (Iceland, Maldives, Kyoto, Patagonia, etc.)
- **Hero content:** Headline + subheadline centered, AI chat input bar directly on page
- **Quick-pick chips:** Going solo · Family trip · Romantic escape · Group adventure · Weekend getaway
- **Nav:** Logo (left) + Sign in / Sign up button (right) — no forced auth wall
- **Auth gate:** User can type freely in the landing chat box; clicking "Go" / submitting triggers Google OAuth modal/redirect, then carries user + their input to `/chat`
- **Scroll section:** How it works (3-step) + destination cards + value prop copy

### Chatbot Page (`/chat`)
- **Layout:** 50/50 split — left chat, right dynamic panel
- **Left:** Conversational AI collecting: destination, travel party, dates, origin city, vibe, budget
- **Right Phase 1 (collecting):** Beautiful destination photo — "Understanding your trip..."
- **Right Phase 2 (done):** Smooth transition to full itinerary view after generation completes
- **Quick-action chips:** Looks good · Change dates · Add a budget
- **Bottom bar:** Itinerary · Flights (future) · Hotels (future)

### Itinerary Standalone
- Existing `/itinerary/[id]` page kept for direct link sharing

### Auth
- Google OAuth only (already implemented in Phase 2)
- Unauthenticated users land on `/`, type prompt, hit Go → auth → `/chat?q=<encoded_prompt>`

### Brand & Visual Identity (locked 2026-03-11)

**Color palette** — warm orange + cool navy/brown complementary scheme:
- `#285185` — Deep navy (primary, CTAs, strong UI elements)
- `#D67940` — Warm orange (accent, highlights, numbers, hover states)
- `#6F4849` — Warm umber/brown (secondary accent, depth, card accents)
- `#CCD9E2` — Light sky blue (subtle backgrounds, inactive states)

**Logo font** — `Abril Fatface` (Google Fonts, weight 400 — the face is inherently bold)
- Logo text: `Barabula.` (with dot, no space before dot)
- Usage: nav logo only. Body/headline font remains DM Serif Display + Inter.

**Headline copy:** "Where to next?"
**Subheadline copy:** "Your next adventure, planned by AI"
**CTA button text:** "Plan trip"

**Destination cards (v1):** Iceland · Maldives · Kyoto · Patagonia · Santorini · Bali
(More destinations deferred to future — Paris, Amsterdam, off-beat places, etc.)

**Image sourcing:** Pexels API (free, HD, no attribution required for embedding)
- API key stored in `.env.local` as `PEXELS_API_KEY`
- Actual key value: provided by user — executor reads from env or downloads during setup
- Download to: `public/images/destinations/` (one HD JPEG per destination + hero poster)
- Target resolution: 1920×1080 minimum, Pexels "large2x" size

## Reference
- Inspiration screenshots: `/Inspiration/` directory
- Visual reference: layla.ai, Iceland travel site (dribbble.com/shots/19988832)
- Color reference: warm orange (#D67940) + deep navy (#285185) complementary scheme
