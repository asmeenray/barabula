---
phase: 7
slug: ui-overhaul-landing-page-and-chatbot-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | vitest.config.ts (Wave 0 creates if missing) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | Landing layout | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | Video background | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | Hero chat input | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 7-01-04 | 01 | 1 | Auth gate flow | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 2 | Split panel layout | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 2 | Chat panel | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 7-02-03 | 02 | 2 | Right panel transitions | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 2 | Animations | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 2 | Typography/colors | visual/manual | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — configure vitest for Next.js App Router
- [ ] `src/__tests__/setup.ts` — testing library setup
- [ ] Install `vitest @testing-library/react @testing-library/user-event jsdom` if not present
- [ ] `src/__tests__/landing.test.tsx` — stubs for landing page component tests
- [ ] `src/__tests__/chat.test.tsx` — stubs for chat page component tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Video background plays on load | Landing Page UX | Browser API required | Open / in browser, verify video autoplays, is muted, loops |
| Hero animations feel premium | Design quality | Subjective visual QA | Check entrance animations, timing, easing |
| Auth gate: prompt preserved after OAuth | Auth flow | OAuth redirect loop | Type prompt, click Go, complete auth, verify prompt in chat |
| Split panel transition | Chat UX | Visual animation | Complete AI questioning, verify smooth transition to itinerary |
| Quick-pick chips feel playful | Design quality | Subjective | Check chip hover states, click feedback |
| Mobile responsiveness | Responsive design | Multiple screen sizes | Test at 375px, 768px, 1440px |
| Video fallback image | Performance | No video support | Disable video in browser, check poster image |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
