---
phase: 3
slug: core-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | CHAT-01 | unit | `npx vitest run src/lib` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | DASH-01 | unit | `npx vitest run src/lib` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | ITIN-01 | unit | `npx vitest run src/lib` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | CHAT-01 | manual | Browser smoke test | n/a | ⬜ pending |
| 3-02-02 | 02 | 2 | CHAT-02 | manual | Send message, verify AI response | n/a | ⬜ pending |
| 3-02-03 | 02 | 2 | CHAT-03 | manual | Generate itinerary, verify navigation | n/a | ⬜ pending |
| 3-03-01 | 03 | 2 | DASH-01 | manual | Load dashboard, verify list | n/a | ⬜ pending |
| 3-03-02 | 03 | 2 | DASH-04 | manual | Delete itinerary, verify removal | n/a | ⬜ pending |
| 3-04-01 | 04 | 2 | ITIN-01 | manual | View day-by-day itinerary detail | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` and `@vitejs/plugin-react` — install if not present
- [ ] `vitest.config.ts` — configure with jsdom environment
- [ ] `src/lib/__tests__/queries.test.ts` — stubs for Supabase query functions

*Wave 0 must complete before any automated tests can run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat sends message and gets AI response | CHAT-02 | Requires live OpenAI API call | Open /chat, type a message, submit |
| AI response triggers itinerary navigation | CHAT-03 | Requires intent detection + navigation | Ask for itinerary, verify redirect |
| Dashboard shows user's itineraries | DASH-01 | Requires live Supabase data | Load /dashboard after login |
| Delete updates list immediately | DASH-04 | Requires UI mutation + refetch | Click delete, verify item removed |
| Itinerary detail renders day-by-day | ITIN-01 | Requires structured AI data | View /itinerary/[id] |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
