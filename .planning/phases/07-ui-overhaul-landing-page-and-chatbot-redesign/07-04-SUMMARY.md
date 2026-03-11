---
phase: 07-ui-overhaul-landing-page-and-chatbot-redesign
plan: "04"
subsystem: chat-ui
tags: [chat, split-panel, motion, layout, ui]
dependency_graph:
  requires: [07-01]
  provides: [split-panel-chat, ambient-context-panel, quick-action-chips, bottom-tab-bar]
  affects: [chat-page]
tech_stack:
  added: []
  patterns: [AnimatePresence, useSearchParams-with-Suspense, grid-cols-2-split-layout, layout-override-fixed-inset-0]
key_files:
  created:
    - src/app/(authenticated)/chat/layout.tsx
    - src/components/chat/SplitLayout.tsx
    - src/components/chat/ContextPanel.tsx
    - src/components/chat/QuickActionChips.tsx
    - src/components/chat/BottomTabBar.tsx
  modified:
    - src/app/(authenticated)/chat/page.tsx
    - src/__tests__/split-layout.test.tsx
    - src/__tests__/context-panel.test.tsx
    - src/__tests__/quick-action-chips.test.tsx
    - src/__tests__/chat-page.test.tsx
decisions:
  - "Fixed inset-0 layout override used for full-bleed chat (no nav visible on chat page — luxury immersive feel)"
  - "useSearchParams wrapped in Suspense boundary per Next.js App Router requirement"
  - "Light-themed chip buttons for QuickActionChips (not Chip component) — Chip is white-on-dark for video hero, chat panel is light background"
  - "getByText exact strings in context-panel tests — regex caused multiple-match failures with AnimatePresence rendering both panels in DOM simultaneously"
metrics:
  duration: "4 min"
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_changed: 10
---

# Phase 7 Plan 04: Chat UI Split-Panel Redesign Summary

50/50 split-panel chat UI with AnimatePresence ambient-to-itinerary context panel, quick-action chips, bottom tab bar, and layout override for full-viewport immersion.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SplitLayout + ContextPanel + chat layout override | ddc66f3 | SplitLayout.tsx, ContextPanel.tsx, chat/layout.tsx |
| 2 | QuickActionChips + BottomTabBar + updated chat page | 8cfd413 | QuickActionChips.tsx, BottomTabBar.tsx, chat/page.tsx |

## What Was Built

**SplitLayout** — CSS grid `grid-cols-2 h-screen overflow-hidden` wrapper. Left column holds chat thread with `border-r border-gray-100`. Right column has `bg-gray-950` dark ambient background. Both constrained to `h-screen overflow-hidden`.

**ContextPanel** — Right panel with `AnimatePresence mode="wait"`. When `itineraryData` is null: shows random ambient travel image (4 Unsplash photos, selected per session) with dark overlay and centered "Understanding your trip..." / "Building your itinerary..." text. When `itineraryData` is provided: fades in structured itinerary summary card (title, destination, days/activities stats grid, date range) on dark background. Transition: ambient exits with `opacity: 0, scale: 0.98`; itinerary enters with `opacity: 0, y: 20`.

**chat/layout.tsx** — `fixed inset-0 top-0 z-10 bg-white` layout override. Escapes the parent `(authenticated)/layout.tsx`'s `max-w-6xl mx-auto px-4 py-8` container, making chat full-viewport. `z-10` sits above the nav.

**QuickActionChips** — 3 light-themed pill buttons ("Looks good", "Change dates", "Add a budget") that call `onSend` with expanded messages. Returns `null` when `disabled=true` (hidden during AI response). Light border/bg styling instead of the dark Chip component (chat panel has white background).

**BottomTabBar** — Itinerary (active, `border-t-2 border-gray-900`), Flights (disabled, `opacity-40 cursor-not-allowed`), Hotels (disabled). Purely structural — Flights/Hotels are future features per CONTEXT.md.

**Updated chat page.tsx** — Complete split-panel integration:
- `useSearchParams` reads `?q=` param → pre-fills input (from landing page hero)
- `getPrompt()` fallback reads from sessionStorage (alternative transfer path)
- `latestItineraryData` state passed to ContextPanel — ambient until itinerary generated
- All existing API logic preserved: history fetch, send message, itinerary fetch, `router.push` after 2500ms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ContextPanel tests: `getByText` multiple match failure**
- **Found during:** Task 1 — GREEN phase
- **Issue:** AnimatePresence renders both ambient and itinerary panels in the DOM simultaneously during exit transition. `getByText(/building your itinerary|crafting/i)` matched two nodes.
- **Fix:** Changed second test to use exact string `'Building your itinerary...'` (the label text, not the headline) which appears only once. Changed first test similarly to `'Understanding your trip...'`.
- **Files modified:** `src/__tests__/context-panel.test.tsx`
- **Commit:** ddc66f3

**2. [Rule 1 - Bug] chat-page.test.tsx: missing `useSearchParams` in navigation mock**
- **Found during:** Task 2 — after updating chat page to use `useSearchParams`
- **Issue:** Existing `vi.mock('next/navigation', ...)` only exported `useRouter` and `usePathname`. New page calls `useSearchParams()` which threw "No useSearchParams export is defined on mock".
- **Fix:** Added `useSearchParams: () => ({ get: () => null })` to the mock. Also updated "Plan your next trip" empty state text to "Where to next?" to match new premium header.
- **Files modified:** `src/__tests__/chat-page.test.tsx`
- **Commit:** 8cfd413

## Test Results

| Test File | Tests |
|-----------|-------|
| split-layout.test.tsx | 3/3 passed |
| context-panel.test.tsx | 3/3 passed |
| quick-action-chips.test.tsx | 4/4 passed |
| chat-page.test.tsx | 3/3 passed |
| All other test files | 42/42 passed |
| **Total** | **55/55 passed** |

Build: `npm run build` exits 0, no TypeScript errors.

## Self-Check: PASSED

All created files exist:
- `src/app/(authenticated)/chat/layout.tsx` — FOUND
- `src/components/chat/SplitLayout.tsx` — FOUND
- `src/components/chat/ContextPanel.tsx` — FOUND
- `src/components/chat/QuickActionChips.tsx` — FOUND
- `src/components/chat/BottomTabBar.tsx` — FOUND

Commits exist:
- `ddc66f3` — Task 1 (SplitLayout, ContextPanel, layout override)
- `8cfd413` — Task 2 (QuickActionChips, BottomTabBar, chat page update)
