# Feature Research

**Domain:** Travel AI App — Small-Group Itinerary Generation and Collaboration
**Researched:** 2026-03-09
**Confidence:** MEDIUM (ecosystem search verified against multiple sources; specifics for REST-based collab patterns derived from broader async collab patterns — no single authoritative source)

---

## Context

Barabula is a brownfield revamp, not a greenfield project. The backend already implements: AI itinerary generation, AI chat, user auth, itinerary CRUD, activity management, and a basic collaboration model. The frontend has placeholder pages for Chat, Dashboard, and Itineraries. Real-time Socket.IO collaboration is being dropped in favor of REST-based collaboration.

This research answers: what do production travel AI apps have, and what should this revamp prioritize?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Working AI itinerary generation | Core product promise — user gives trip details, AI returns a structured plan | MEDIUM | Backend exists but is broken (OpenAI SDK v0 call pattern); must be fixed before anything else matters |
| Day-by-day itinerary view | Every competitor (Wanderlog, TripIt, Tripadvisor) shows a structured day-by-day breakdown; anything less feels like raw data | MEDIUM | Backend returns structured activity data; frontend needs to render it as a timeline, not a flat list |
| Activity detail in itinerary | Each item needs name, time, location, description, estimated duration — users click activities expecting detail | LOW | Backend stores this; frontend needs to expose it cleanly |
| Itinerary list / dashboard | Users need to see all their trips, not just the one they just created | LOW | Backend CRUD is fully implemented; Redux thunks and dashboard UI are missing |
| Create itinerary from chat | The AI chat is the entry point for generation; if the chat doesn't produce a viewable itinerary, the loop is broken | MEDIUM | Backend: POST /chat/generate-itinerary exists; frontend chat is a placeholder |
| Working authentication | Login/register/session persistence must work; auth failure blocks everything | LOW | Backend is correct; frontend has wrong API base URL (port 3001 vs 8000) — one-line fix |
| Persistent chat history | Users expect to return and see previous AI conversations; chat history is part of continuity | LOW | Backend stores and retrieves chat history; frontend chatSlice needs async thunk for history fetch |
| View itinerary you didn't create (collaborator) | Core group use case — if a member cannot view a shared trip, the product has no group value | LOW | Model and schema exist; API endpoint and frontend UI need to be built |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required at launch, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Conversational itinerary refinement | After generation, user can say "swap day 2 lunch for something vegetarian" and the AI updates the plan — competitors offer full regeneration but few offer targeted refinement | HIGH | Requires follow-up prompt context; GPT-4 can do this but the chat context/itinerary link must be designed carefully |
| Per-day or per-activity regeneration | Regenerate only Monday without touching the rest — reduces the "start over" frustration users report with full-plan regeneration | MEDIUM | Targeted regeneration is a documented AI UX pattern (ShapeOfAI "Modify" pattern); requires scoping the prompt to a subset of the plan |
| Collaborator invite by username/email | Adding a person to a trip and controlling whether they can edit or only view — expected by anyone who has used Wanderlog; Barabula's model already has ItineraryCollaborator | LOW-MEDIUM | DB model, schema, and relationships exist; API endpoints for invite/accept and frontend UI are missing |
| Role-based collaboration (owner / editor / viewer) | Owner can invite and modify; editors can add/change activities; viewers are read-only — avoids the "anyone with the link can break things" problem | MEDIUM | YouLi, Wanderlog, and other group apps all use this pattern; ItineraryCollaborator already has a `role` concept in the DB schema |
| Structured itinerary prompt builder | Instead of a blank chat box, give users a short-form (destination, dates, travel style, budget, group size) to seed the AI — reduces empty-prompt anxiety | LOW | Common in Wonderplan, Mindtrip, Vacay; reduces prompt quality variance; does not replace chat, supplements it |
| Trip summary card | A shareable, scannable summary (destination, dates, group members, highlights) as a header above the day-by-day plan — gives the trip an identity | LOW | Pure frontend; no backend changes needed |
| Activity status tracking | Mark activities as confirmed, tentative, or skipped — lets the group manage execution against the AI plan | LOW-MEDIUM | Could be a simple status field on Activity; useful without real-time sync because state is explicit |

### Anti-Features (Things to Deliberately NOT Build Yet)

Features that are commonly requested or seem natural but create problems disproportionate to value at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing (Socket.IO) | "Google Docs for trips" is the mental model; Wanderlog markets it heavily | Already scoped out — in-memory state, race conditions, requires Redis pub/sub, adds a third service, and was the source of the MCP/Node complexity being retired | REST-based collaboration: invite users, optimistic local updates, explicit save. Sufficient for small known groups. |
| Booking integration (flights, hotels) | Every review of AI travel apps treats bookable results as a premium signal | Requires third-party API contracts (Amadeus, Skyscanner, Booking.com), payment handling, legal terms; massive scope for a small-group internal app | Show estimated prices as context in the itinerary (already partially supported via Amadeus in the codebase); deep linking to booking sites is sufficient |
| Expense splitting / shared budget tracking | Group travel apps like Wanderlog and Splittr include this; it is a real pain point | Scope-doubles the product — becomes a fintech app; requires trust/correctness guarantees, not just UX polish | Out of scope for this milestone; budget estimates per activity are sufficient for now |
| Email notifications for collaboration | "Someone edited your trip" notifications feel complete | Requires email service setup (SendGrid/SES), unsubscribe flows, rate control; the app targets a small known group who can coordinate out-of-band | Link sharing + last-modified timestamps are sufficient for a known-group context |
| Mobile app | Travel is inherently mobile | Web-first is correct for a revamp; native mobile is a separate project; responsive web is achievable within scope | Ensure responsive CSS; mobile browser support is sufficient |
| Social discovery / public trips | "Share your trip to inspire others" features grow user base | This is a private app for a small known group; social features require moderation, privacy controls, and content policy | Keep trips private by default; collaboration invite-only |
| Offline mode | Downloading itinerary to phone for no-wifi use | PWA offline support requires service workers, cache strategy, sync-on-reconnect logic — significant engineering investment | Export to PDF is a low-cost substitute that covers the real need (having the plan available without connectivity) |

---

## Feature Dependencies

```
[Working Auth]
    └──required by──> [All other features]

[Working AI Itinerary Generation]
    └──required by──> [Day-by-Day Itinerary View]
    └──required by──> [Conversational Refinement]
    └──required by──> [Per-Day Regeneration]

[Itinerary List / Dashboard]
    └──required by──> [Collaborator View]
    └──required by──> [Collaborator Invite]

[Collaborator Invite]
    └──required by──> [Role-Based Collaboration]
    └──required by──> [Activity Status Tracking (as shared state)]

[AI Chat UI]
    └──required by──> [Create Itinerary from Chat]
    └──required by──> [Conversational Refinement]
    └──enhanced by──> [Prompt Builder Form]

[Activity Detail View]
    └──enhanced by──> [Activity Status Tracking]
```

### Dependency Notes

- **Working Auth requires fixing first:** The frontend API URL pointing to the wrong port (3001 vs 8000) means nothing works. This is a one-line fix but it blocks everything downstream.
- **AI generation fix is the second critical gate:** The OpenAI SDK v0/v1 mismatch crashes every AI call. Without real AI output, the itinerary view and chat features have no real content to display.
- **Itinerary list must precede collaboration:** You cannot invite someone to view a trip if the trip is not accessible in the UI. The dashboard/itinerary list page unlocks the collaboration entry point.
- **Chat UI required before refinement:** Conversational refinement is a differentiator that builds on a working chat UI. The chat UI must be implemented before refinement is attempted.
- **Collaborator invite is a prerequisite for role-based collab:** The invite flow (API endpoint + frontend UI) must exist before role granularity is meaningful. The DB model already supports roles; the gap is the invite API and UI.

---

## MVP Definition

For this brownfield revamp milestone, MVP means: the app actually works end-to-end for its core use case.

### Launch With (v1 — this milestone)

- [ ] Working authentication — fix API base URL; users can log in and stay logged in
- [ ] Working AI itinerary generation — fix OpenAI SDK v0 → v1; the core product promise functions
- [ ] Chat UI implemented — replace placeholder; users can have a conversation with the AI and trigger generation
- [ ] Dashboard / itinerary list implemented — replace placeholder; users can see and navigate their trips
- [ ] Day-by-day itinerary view — structured view of generated trip; activities show name, time, description
- [ ] Collaborator invite flow — invite by username/email, accepted via link or in-app notification; the foundational group feature
- [ ] Collaborator view access — invited users can view (but not necessarily edit) a shared itinerary

### Add After Validation (v1.x)

- [ ] Role-based collaboration (editor vs viewer) — add after basic invite/view works and the group finds it limiting
- [ ] Structured prompt builder — add if users report confusion about what to type; supplement the chat box with a short-form
- [ ] Per-activity status (confirmed/tentative/skipped) — add when users start actively using trips for execution, not just planning
- [ ] Trip summary card header — add as a polish pass once core flows are stable

### Future Consideration (v2+)

- [ ] Conversational itinerary refinement — high-value differentiator; defer until the basic chat/generation loop is validated and stable
- [ ] Per-day or per-activity regeneration — follows from refinement; depends on stable generation first
- [ ] Export to PDF / offline access — common request; implement as a lightweight download endpoint when users ask for it
- [ ] Real-time collaboration — reconsider only if the small-group context grows; requires Redis pub/sub infrastructure

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix auth (API URL) | HIGH | LOW | P1 |
| Fix AI generation (SDK v0→v1) | HIGH | LOW | P1 |
| Chat UI | HIGH | MEDIUM | P1 |
| Dashboard / itinerary list | HIGH | MEDIUM | P1 |
| Day-by-day itinerary view | HIGH | MEDIUM | P1 |
| Collaborator invite flow | HIGH | MEDIUM | P1 |
| Collaborator view access | HIGH | LOW | P1 |
| Fix metadata/extra_data mismatch | HIGH | LOW | P1 (silent data loss blocks itinerary display) |
| Fix security issues (secrets, password logging) | HIGH | LOW | P1 (hygiene prerequisite) |
| Role-based collaboration | MEDIUM | MEDIUM | P2 |
| Structured prompt builder | MEDIUM | LOW | P2 |
| Activity status tracking | MEDIUM | LOW | P2 |
| Trip summary card | LOW | LOW | P2 |
| Conversational refinement | HIGH | HIGH | P3 |
| Per-day/activity regeneration | MEDIUM | HIGH | P3 |
| Export to PDF | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone — app is non-functional or missing core value without it
- P2: Should have — adds meaningful value once P1 is stable
- P3: Nice to have — defer; implement after product-market validation

---

## Competitor Feature Analysis

| Feature | Wanderlog | TripIt | Mindtrip | Barabula Approach |
|---------|-----------|--------|----------|-------------------|
| AI itinerary generation | Yes (AI suggestions) | No (import-only) | Yes (conversational) | Yes — GPT-4 chat-driven generation; fix SDK and it works |
| Day-by-day view | Yes (core UX) | Yes (timeline) | Yes (visual) | Build: backend data exists, frontend view is missing |
| Collaborative editing | Yes (Google Docs style, real-time) | No (view-only sharing) | No | REST-based: invite + refresh; sufficient for small known group |
| Role-based permissions | Yes (edit / view) | No | No | Build: DB model already has role concept; needs API + UI |
| Chat / AI refinement | Limited | No | Yes (core UX) | Build chat UI first; refinement is a v2 differentiator |
| Booking integration | Yes (affiliate links) | Yes (email import) | Yes | Skip for this milestone; deep-link to external sites |
| Expense tracking | Yes | No | No | Anti-feature for this milestone |
| Mobile app | Yes (iOS/Android) | Yes (iOS/Android) | Yes (iOS/Android) | Responsive web only; mobile app is out of scope |
| Offline access | Yes (download) | Yes (download) | No | Anti-feature for this milestone; PDF export is v2 |

---

## What Makes AI Travel Chat Good (UX Synthesis)

Based on research into Mindtrip, Vacay, and comparative chatbot reviews, the following patterns distinguish good AI travel chat from mediocre:

**Good:**
- Responds with structured output (tables, day-by-day lists) not wall-of-text prose — users scan, not read
- Shows a "travel logistics primer" before the detailed plan (dates, transport mode, rough budget context)
- Sources are implicit in structure (e.g., "typically 2-3 hours" is credible; vague "you might enjoy" is not)
- Allows follow-up refinement in the same thread without losing context
- Gives multiple options when suggesting restaurants, hotels, or activities — not just one recommendation
- Conversational tone — "smart concierge" not "search engine results page"

**Bad:**
- Returns the same generic plan regardless of specifics (budget, travel pace, group size)
- Ignores seasonal/timing context ("the museum is closed Mondays" matters)
- Returns unstructured freeform text — hard to save, share, or act on
- Has no continuity between sessions — every chat starts from zero

**For Barabula specifically:** The backend already returns structured JSON from GPT-4 and stores it to the database. The chat UI needs to render the AI's response as structured content (day cards, activity items) rather than rendering it as a chat bubble with a wall of text. The generation response already produces a full itinerary object — the frontend should redirect or navigate to the itinerary view after generation succeeds, not just display the raw text in chat.

---

## Sources

- [My honest review: 5 best AI trip planners (2025 guide)](https://www.jotform.com/ai/best-ai-trip-planner/) — feature expectations
- [I Tested 5 Top AI Travel Tools With the Same Complex Request](https://www.imean.ai/blog/articles/i-tested-5-top-ai-travel-tools-with-the-same-complex-request-heres-who-actually-delivered/) — what separated good from mediocre AI travel tools
- [I Tried 4 AI Travel Planning Apps](https://www.afar.com/magazine/we-tested-ai-travel-planning-apps-here-are-the-3-that-actually-worked) — real-world user review patterns
- [Best Group Travel Planning Apps in 2025](https://www.avosquado.app/blog/best-group-travel-planning-apps-in-2025-complete-comparison) — collaboration feature comparison
- [Wanderlog vs TripIt: Best Travel Planning Apps 2025](https://tineo.ai/blog/best-travel-planning-apps-2025-comparison/) — role-based collaboration patterns
- [Best Travel Planning Apps for Groups in 2025: Plan Harmony vs TripIt vs Wanderlog](https://www.planharmony.com/blog/best-travel-planning-apps-for-groups-in-2025-plan-harmony-vs-tripit-vs-wanderlog/) — group trip feature expectations
- [AI UX Patterns: Regenerate](https://www.shapeof.ai/patterns/regenerate) — regenerate/modify UX patterns
- [Progressive Disclosure in AI-Powered Product Design](https://uxplanet.org/progressive-disclosure-in-ai-powered-product-design-978da0aaeb08) — progressive disclosure patterns for AI output
- [Team Roles and Trip Planners - YouLi Collaboration](https://support.youli.io/360001314975-Team-Roles-Trip-Planners-Collaboration) — role-based collab patterns in travel apps
- [Top All-in-One Travel Apps for 2025: Features and Trends](https://www.miquido.com/blog/all-in-one-travel-app/) — market landscape

---
*Feature research for: Travel AI App — Small-Group Itinerary Generation and Collaboration (Barabula)*
*Researched: 2026-03-09*
