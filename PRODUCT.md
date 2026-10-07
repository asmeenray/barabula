# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Web-first installable PWA, Android-first, used one-handed on a phone. The laptop is an equal first-class surface for planning (Asmeen, 5 Oct 2026). No native app — D3, D10.)

## Users

- **First:** Asmeen and friends. Android users who save food and going-out reels in their own city, and travel reels for 6+ trips a year. They plan on a laptop and navigate with Google Maps.
- **Next:** people who save places from Instagram, TikTok and Facebook and never find them again.
- **Situations:** on the sofa sharing a reel (capture); on a laptop before a trip (plan); on a street in a foreign city, in sunlight, one hand free (go); at home on a free evening (Tonight, phase 19).

## Product Purpose

A trip planner fed by your saves (D1 revised 5 Oct 2026, Q30). You make a trip (city + dates), bring in places by search, pasted links and later shared reels, and the AI plans your days around your own places. Capturing a reel straight into a trip is a feature, not the whole product. Success: you plan and follow a real trip with it, and stop rebuilding plans from scattered saved folders.

## Positioning

Plans start from your places, not the famous spots every AI planner suggests. Calm on purpose (no feed, no pop-ups, no paywalled basics) and Android-first. Rivals: AI itinerary apps (Layla, Mindtrip, Wanderlog, Google Maps Ask Maps) start from zero; reels-to-map apps (20+, incl. Placify 2.0, released 24 Sep 2026) start from saves but are mostly iOS-first and cluttered.

## Operating Context

- Core loop: Start a trip (city + dates) → Add places (search, paste a link, later share a reel; each confirmed on a review card) → Plan (AI builds days around your places; you edit) → Go (Today view). Saves outside a trip are kept for later trips.
- Inputs come only from official oEmbed lookups and files the user shares. No scraping, no logging in as the user.
- Navigation: three tabs only (names and home tab to be settled in the phase 16 UI-SPEC; handover §4.2 had Map · Trips · You with Map as home). "Ask" is a sheet, not a tab. Capture is a sheet opened from the Android share or the + button.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, Supabase (Postgres, PostGIS, RLS, Auth), Vercel, MapLibre via react-map-gl, Motion.
- Places come from FSQ OS Places; Mapbox geocoding results are never stored.
- Never save a place without the user's confirmation. Ask never edits data without "Apply".
- Every destructive action has undo; every AI result can be corrected in one tap.
- Performance budgets (mid-range Android, 4G): map interactive ≤ 2 s, place sheet ≤ 300 ms, share → review card ≤ 3 s, ≤ 200 KB gzipped JS on the Map route (excluding the map library).
- Open: map tile provider (Q5), India at launch (Q6), brand palette (Q14).

## Brand Commitments

- Name: Barabula. Wordmark "Barabula." with the trailing full stop.
- Navy `#285185` is the brand link carried into the new system.
- Plain words: name things by what people do ("Save place", "Plan a trip"), never by how they're built. Headings, statuses and moments may use an airline voice ("Now boarding: Lisbon", DELAYED); buttons and form labels stay plain verbs (Asmeen, 6 Oct 2026).
- Visual world (phase 16): Gate Board + photo passes — airport departure-board logic with HD destination photos as pass covers; Tag yellow accent; light ("airport daylight") and dark themes.

## Evidence on Hand

- No real user data, testimonials or metrics yet. Do not fabricate place names, saves counts, creators or reviews in UI; use obvious placeholders.
- Market research and competitor list: docs/PROJECT.md section 7.

## Product Principles

1. Your saves first — the AI works for your list.
2. Never silently wrong — every AI result is shown before saving and fixable in one tap.
3. Calm — one primary action per screen, three tabs, no interruptions (no tours, upsell modals, rating prompts).
4. Yours to take — export, delete account, dark mode and one offline trip are always free.
5. Within the rules — no scraping, no downloading platform videos.

## Accessibility & Inclusion

WCAG AA contrast, visible focus, reduced motion respected, readable in bright sunlight, thumb-first (primary actions in the bottom third, one-handed use).
