---
phase: 12
slug: mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + React Testing Library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- --run src/components/chat/SplitLayout` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run src/components/chat/SplitLayout`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-W0-01 | 01 | 0 | Stale test fix | unit | `npm run test -- --run src/components/chat/SplitLayout` | ❌ W0 | ⬜ pending |
| 12-01-01 | 01 | 1 | SplitLayout mobile hide | unit | `npm run test -- --run src/components/chat/SplitLayout` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | Overlay animation | manual | Visual check on mobile viewport | N/A | ⬜ pending |
| 12-01-03 | 01 | 1 | Auto-navigation | manual | DevTools mobile sim, generate itinerary | N/A | ⬜ pending |
| 12-02-01 | 02 | 2 | "Chat again" FAB | manual | Mobile viewport, check FAB presence on itinerary page | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/chat/__tests__/split-layout.test.tsx` — update stale assertions (`grid-cols-2` → actual classes, `h-screen` → actual classes)

*Wave 0 must complete before Wave 1 tests can be reliable.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Building your itinerary..." overlay animation | Mobile UX | Visual/animation cannot be asserted in unit tests | Open DevTools → mobile preset → trigger itinerary generation → verify overlay appears with coral spinner, then navigates |
| Auto-navigation on mobile | Mobile nav | Requires real router state | Same as above — verify URL changes to `/itinerary/:id` after overlay |
| "Chat again" FAB safe area | iOS UX | Requires real device or browser safe-area simulation | Check FAB clears iPhone home indicator with `env(safe-area-inset-bottom)` |
| FAB shifts above share banner | Conditional layout | Component state interaction | Toggle share mode → verify FAB moves up |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
