---
phase: 03-core-pages
plan: 02
subsystem: chat-ui
tags: [next.js, react, typescript, vitest, testing-library, chat, openai]

# Dependency graph
requires:
  - phase: 03-core-pages
    plan: 01
    provides: ChatMessage type, /api/chat/history, /api/chat/message, /api/itineraries/[id], Vitest infrastructure
provides:
  - Full chat page UI (src/app/(authenticated)/chat/page.tsx)
  - MessageBubble component (user right-aligned blue, AI left-aligned gray with avatar)
  - ChatInput component (controlled textarea, Enter/Shift+Enter, send button)
  - ItineraryChatCard component (compact itinerary preview card in chat thread)
affects:
  - 03-03 (dashboard page — independent, no chat dependency)
  - 03-04 (itinerary page — receives navigation from chat after itinerary generation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.mock with module-scoped mockPush spy instead of per-test useRouter mock override
    - scrollIntoView globally mocked in test setup — jsdom does not implement it
    - Separate local message type (LocalMessage) extending ChatMessage with optional itineraryData for structured bubble rendering
    - Itinerary preview data fetched separately via /api/itineraries/[id] — API only returns itineraryId, not full data

key-files:
  created:
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/ChatInput.tsx
    - src/components/chat/ItineraryChatCard.tsx
    - src/__tests__/itinerary-chat-card.test.tsx
    - src/__tests__/chat-page.test.tsx
  modified:
    - src/app/(authenticated)/chat/page.tsx
    - src/__tests__/setup.ts

key-decisions:
  - "Module-scoped mockPush spy in vi.mock rather than per-test useRouter override — setup.ts global mock is not a vi.fn() so .mockReturnValue() is unavailable"
  - "scrollIntoView mocked globally in setup.ts — jsdom limitation affects any component using scroll-to-bottom pattern"

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 03 Plan 02: Chat Page Summary

**Bubble chat UI with OpenAI integration — message thread, history loading, typing indicator, structured itinerary preview card, and auto-navigation to /itinerary/[id] after generation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T19:51:39Z
- **Completed:** 2026-03-10T19:55:14Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Full chat page replaces placeholder — bubble layout, scrollable message thread, fixed ChatInput at bottom
- MessageBubble renders user messages right-aligned blue and AI messages left-aligned gray with circular AI avatar
- ItineraryChatCard renders in AI bubble when itinerary generated — title, destination, date range, day count, activity count
- Typing indicator (three animated bouncing dots) visible while AI responds
- History loaded from /api/chat/history on mount; empty state shown when no messages
- Auto-navigation to /itinerary/[id] after 2500ms when API returns itineraryId
- Enter sends message, Shift+Enter adds newline

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests for ItineraryChatCard** - `865e98c` (test)
2. **Task 1: MessageBubble, ChatInput, ItineraryChatCard** - `06575d8` (feat)
3. **TDD RED: Failing tests for chat page** - `7111ef3` (test)
4. **Task 2: Full chat page UI** - `cbd2ba0` (feat)

_Note: TDD tasks have separate commits (test → feat)_

## Files Created/Modified
- `src/app/(authenticated)/chat/page.tsx` - Full chat UI replacing placeholder
- `src/components/chat/MessageBubble.tsx` - User/AI bubble with alignment, colors, avatar
- `src/components/chat/ChatInput.tsx` - Controlled textarea with keyboard shortcuts and send button
- `src/components/chat/ItineraryChatCard.tsx` - Compact itinerary preview card for chat thread
- `src/__tests__/itinerary-chat-card.test.tsx` - 3 tests for card rendering
- `src/__tests__/chat-page.test.tsx` - 3 tests for chat page behavior
- `src/__tests__/setup.ts` - Added scrollIntoView global mock

## Decisions Made
- Module-scoped `mockPush = vi.fn()` inside `vi.mock()` declaration rather than per-test `useRouter.mockReturnValue()` — the global next/navigation mock in setup.ts creates a plain function (not a vi.fn spy), so `mockReturnValue` is not available
- `scrollIntoView` globally mocked in test setup — jsdom does not implement DOM scroll APIs; this pattern is reusable for all future components using scroll-to-bottom behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test plan's router.push assertion used unavailable mockReturnValue pattern**
- **Found during:** Task 2 TDD GREEN verification
- **Issue:** Plan's test code called `(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush })` but the global mock from setup.ts creates a plain function, not a vi.fn() spy — `mockReturnValue` is not available
- **Fix:** Restructured test to declare `mockPush = vi.fn()` at module scope and reference it inside the `vi.mock()` factory
- **Files modified:** `src/__tests__/chat-page.test.tsx`
- **Commit:** `cbd2ba0`

**2. [Rule 2 - Missing critical functionality] scrollIntoView not mocked in test environment**
- **Found during:** Task 2 TDD GREEN verification
- **Issue:** jsdom does not implement `scrollIntoView` — the chat page's useEffect called `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` which threw `TypeError: scrollIntoView is not a function` in all three tests
- **Fix:** Added `window.HTMLElement.prototype.scrollIntoView = vi.fn()` to `src/__tests__/setup.ts`
- **Files modified:** `src/__tests__/setup.ts`
- **Commit:** `cbd2ba0`

**3. [Rule 1 - Bug] Test file used bare globals (it, expect) without vitest imports**
- **Found during:** Task 1 TDD RED TypeScript check
- **Issue:** Plan's test code used `it()` and `expect()` as bare globals, but `globals: true` in vitest config does not add TypeScript type declarations — `tsc --noEmit` reported "Cannot find name 'it'"
- **Fix:** Added explicit `import { it, expect } from 'vitest'` to match existing test file conventions
- **Files modified:** `src/__tests__/itinerary-chat-card.test.tsx`
- **Commit:** `06575d8`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical test infrastructure)
**Impact on plan:** All fixes necessary for test reliability and TypeScript correctness. No scope creep.

## Issues Encountered
- jsdom's lack of scroll APIs is a common source of test failures — global mock in setup.ts is the correct pattern to handle this once for all tests
- Vitest `globals: true` config enables runtime globals but does not add TypeScript type declarations without adding `"@vitest/globals"` to tsconfig types — explicit imports are the correct pattern

## User Setup Required
None.

## Next Phase Readiness
- Chat UI is complete — Plan 03-03 (Dashboard) and 03-04 (Itinerary) are independent and can proceed
- scrollIntoView mock in setup.ts benefits all future components that use scroll-to-bottom patterns

---
*Phase: 03-core-pages*
*Completed: 2026-03-10*

## Self-Check: PASSED

- src/app/(authenticated)/chat/page.tsx: FOUND
- src/components/chat/MessageBubble.tsx: FOUND
- src/components/chat/ChatInput.tsx: FOUND
- src/components/chat/ItineraryChatCard.tsx: FOUND
- src/__tests__/itinerary-chat-card.test.tsx: FOUND
- src/__tests__/chat-page.test.tsx: FOUND
- .planning/phases/03-core-pages/03-02-SUMMARY.md: FOUND
- Commit 865e98c: FOUND
- Commit 06575d8: FOUND
- Commit 7111ef3: FOUND
- Commit cbd2ba0: FOUND
