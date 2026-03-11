# Deferred Items — Phase 08

## Pre-existing Test Failure (Out of Scope)

**File:** `src/__tests__/split-layout.test.tsx`
**Test:** `SplitLayout > has grid-cols-2 for the 50/50 split`
**Issue:** Test expects `grid-cols-2` class but SplitLayout was changed to `flex h-screen` during Phase 07 UI overhaul. The implementation is correct; the test was not updated to match.
**Discovered during:** 08-04
**Fix required:** Update test to expect `flex` layout classes instead of `grid-cols-2`.
