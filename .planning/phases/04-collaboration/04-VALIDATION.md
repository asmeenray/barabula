---
phase: 4
slug: collaboration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts |
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
| 04-01-01 | 01 | 1 | COLLAB-01 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | COLLAB-03 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | COLLAB-06 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | COLLAB-07 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | COLLAB-02 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | COLLAB-04 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | COLLAB-05 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/collaboration/invites.test.ts` — stubs for COLLAB-01, COLLAB-02
- [ ] `__tests__/collaboration/rls.test.ts` — stubs for COLLAB-03, COLLAB-04
- [ ] `__tests__/collaboration/conflict.test.ts` — stubs for COLLAB-06, COLLAB-07
- [ ] `__tests__/collaboration/ui.test.ts` — stubs for COLLAB-05 (UI role enforcement)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner invites non-existent email; user registers; invite auto-converts | COLLAB-01 | Requires live Supabase trigger + auth flow | Create invite, register new user, verify collaborators row created |
| 409 Conflict toast shown and itinerary reloads | COLLAB-06 | Requires concurrent browser sessions | Open itinerary in two tabs, edit in both simultaneously |
| Viewer sees no edit controls | COLLAB-05 | Visual inspection | Log in as viewer, verify Add/Edit/Delete buttons absent |
| Remove collaborator revokes access immediately | COLLAB-07 | Requires two sessions | Remove collaborator while second session is active, verify 403/redirect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
