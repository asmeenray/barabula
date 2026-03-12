---
phase: 11-visual-enrichment-and-trip-sharing
plan: "02"
subsystem: ui/itinerary-cards
tags: [glassmorphism-removal, performance, photo-display, ratings, next-image, brand-palette]
dependency_graph:
  requires: [11-01]
  provides: [activity-card-photos, activity-card-ratings, destination-cards-brand-palette]
  affects: [src/components/itinerary/ActivityCard.tsx, src/components/itinerary/DaySection.tsx, src/components/landing/DestinationCards.tsx]
tech_stack:
  added: []
  patterns: [next/image fill with gradient overlay, extra_data typed cast pattern, PRICE_SYMBOLS const]
key_files:
  created: []
  modified:
    - src/components/itinerary/ActivityCard.tsx
    - src/components/itinerary/DaySection.tsx
    - src/components/landing/DestinationCards.tsx
decisions:
  - "No backdropFilter on activity cards — solid rgba backgrounds maintain legibility without GPU compositing layers"
  - "photo_url from extra_data rendered via next/image fill with dark-bottom gradient overlay for text legibility"
  - "PRICE_SYMBOLS Record<number,string> const defined at module level above component for tree-shaking"
  - "layout prop removed from ActivityCard motion.div — reduces layout animation overhead on large itinerary lists"
  - "DestinationCards uses width/height hint fields (800x480) in DESTINATIONS array per next/image static pattern"
metrics:
  duration: "7min"
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 3
---

# Phase 11 Plan 02: Remove Glassmorphism, Photo+Ratings on Activity Cards, Brand Palette on Destination Cards Summary

Photo-first activity card redesign (no blur), photo header + rating row from extra_data, next/image and brand palette cleanup on landing destination cards.

## Tasks Completed

| # | Task | Commit | Files Modified |
|---|------|--------|----------------|
| 1 | Remove glassmorphism, add photo+rating to activity cards | f866e5a | ActivityCard.tsx, DaySection.tsx |
| 2 | Upgrade DestinationCards to next/image and brand palette | 8d84ff5 | DestinationCards.tsx |

## What Was Built

### Task 1: Activity Card Glassmorphism Removal + Photo/Rating

**DaySection.tsx (ActivityCardItem):**
- Removed `backdropFilter: 'blur(12px)'` — solid rgba backgrounds retained
- Added `PRICE_SYMBOLS` const at module level: `{ 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }`
- Photo variables extracted: `photoUrl` (non-hotel only), `placesRating`, `placesReviewCount`, `placesPriceLevel`
- Photo header: `<div relative h-128px><Image fill object-cover /><gradient overlay /></div>` renders above main row when `extra_data.photo_url` is set
- Rating row in expanded section: coral star + rating, umber review count in parens, navy subdued price level symbol

**ActivityCard.tsx (ContextPanel/chat preview):**
- Removed `backdropFilter: 'blur(12px)'`
- Removed `layout` prop from motion.div (layout animation overhead reduction)
- Added `overflow-hidden` class to root motion.div for photo clipping
- Photo header: 112px tall with next/image fill + gradient overlay, renders before content div when `extra_data.photo_url` set
- Content wrapped in `<div className="p-4">` to maintain existing padding

### Task 2: DestinationCards Brand Palette + next/image

- `Image` from `next/image` imported; all `<img>` tags replaced
- `width: 800, height: 480` added to each DESTINATIONS entry as display hints
- Section heading `text-gray-900` → `style={{ color: '#285185' }}` (navy)
- Card label `text-gray-400` → `style={{ color: 'rgba(111,72,73,0.5)' }}` (umber subdued)
- Card title `text-gray-900` → `style={{ color: '#285185' }}` (navy)
- Card subtitle `text-gray-500` → `style={{ color: 'rgba(111,72,73,0.6)' }}` (umber)
- "Start planning →" link: removed `text-gray-900 hover:text-coral`, applied `style={{ color: '#D67940' }}` always
- Value prop heading `text-gray-900` → `style={{ color: '#285185' }}`
- Value prop body `text-gray-500` → `style={{ color: 'rgba(111,72,73,0.6)' }}`
- CTA button `bg-navy hover:bg-navy-light` (non-existent Tailwind class) → `style={{ backgroundColor: '#285185' }}` + `hover:opacity-90`

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

All tests in scope pass:
- `activity-row.test.tsx`: 5/5 pass
- `itinerary-detail.test.tsx`: 7/7 pass (run standalone; full-suite timeout is pre-existing flakiness)
- `video-hero.test.tsx`: 5/5 pass
- TypeScript: `npx tsc --noEmit` clean

Pre-existing failures (not caused by this plan): split-layout.test.tsx (h-screen/grid-cols-2 assertions on outdated class names), hotel-card.test.tsx (star rating rendering), chat-page.test.tsx (router push timeout) — all confirmed present before these changes via git stash verification.

## Self-Check: PASSED

- `src/components/itinerary/ActivityCard.tsx` — EXISTS, no backdropFilter, Image imported
- `src/components/itinerary/DaySection.tsx` — EXISTS, no backdropFilter, Image imported, PRICE_SYMBOLS defined
- `src/components/landing/DestinationCards.tsx` — EXISTS, no img tags, no gray-* classes
- Commit f866e5a — EXISTS
- Commit 8d84ff5 — EXISTS
