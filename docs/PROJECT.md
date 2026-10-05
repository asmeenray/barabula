# Barabula — Project Description

**Version:** 1.0 · 5 October 2026
**Owner:** Asmeen (solo developer)
**Status:** Hobby project, rebuild starting at phase 14
**Companion:** `docs/HANDOVER.md` (the how: architecture, data model, roadmap). This file is the why.

---

## 1. In one line

**The places you saved, turned into plans you actually go to.**

## 2. The pitch

You save a café from a reel on Friday, a viewpoint from a TikTok on Sunday, and a restaurant a friend sent on Facebook. A month later you're free on a Saturday evening, or you've booked a weekend in Lisbon, and none of it is anywhere you can find.

Barabula is where those saves go. Share a reel, link or screenshot from your phone; Barabula finds the place, shows you what it found, and pins it on your map with one tap. When you're free tonight, it shows what's open near you from your own saves. When you're going away, it turns your saves for that city into a day-by-day plan you can follow.

It is calm on purpose: no feed, no pop-ups, no paywalled dark mode. Your data exports to Google Maps whenever you want.

## 3. The problem

- **The save graveyard.** Instagram, TikTok and Facebook make saving easy and finding again hard. Saved folders aren't searchable by place, city or what's open. People screenshot, DM reels to themselves, or forget.
- **Captions don't hold addresses.** Many reels name the place only in the voice-over or as on-screen text, or not at all.
- **Planning tools start from zero.** Itinerary apps ask where you want to go, then suggest the same famous places as everyone else. They ignore the list you've been building for months.
- **Rival apps add friction.** Clutter, upsell pop-ups, basic features behind paywalls, and many are iPhone-only.

## 4. Who it's for

**First (the beachhead):** Asmeen and friends — Android users who save food and going-out reels in their own city, and travel reels for a few trips a year. They use a laptop for planning and Google Maps for getting there.

**Next:** people in the same city who save places from Instagram, TikTok and Facebook and never go. Reached through shared list pages (section 10).

**Later (option):** India, Instagram's largest audience and an Android-first market (section 7.4, option B).

**Not for (now):** groups planning together, people who want a social feed or reviews, business travellers, people who want flights and hotel search.

## 5. What Barabula does

| Step | What the user does | What Barabula does |
|---|---|---|
| Capture | Shares a reel, link, screenshot or screen recording | Finds named places from the caption, the screen and the voice-over (recordings) |
| Confirm | Taps "Save" on a review card | Shows each place it found, unticks unsure ones, lets you fix wrong ones in one tap |
| Collect | Nothing | Pins land on your map, grouped by city, each linked to the reel it came from |
| Tonight *(proposed)* | Opens the app at home | Shows what's open near you now, from your own saves |
| Plan | Picks a city and dates | Builds days around your saves, adds at most two suggestions a day, marked as suggestions |
| Go | Follows the day | "Next: Time Out Market · 12 min walk", directions in Google Maps, works offline |
| Ask *(Plus)* | "It's raining — swap this afternoon" | Proposes an edit; nothing changes until you tap Apply |

**Out of scope for now:** social feed, public profiles, reviews, booking engine, flight search, group editing, visas, native Android app.

## 6. Principles

1. **Your saves first.** The AI works for your list, not the other way round.
2. **Never silently wrong.** Every AI result is shown before it's saved and can be fixed in one tap.
3. **Calm.** One primary action per screen, three tabs, no interruptions.
4. **Yours to take.** Export, delete and dark mode are always free.
5. **Within the rules.** No scraping, no logging in as the user, no downloading videos from platforms.

---

## 7. Market research (checked 5 October 2026)

### 7.1 The landscape

**Reels-to-map apps (direct competitors).** At least 20 exist. Most are small, iOS-first, and launched in 2025–2026.

| App | What it does | Platforms | Signal |
|---|---|---|---|
| Rhyme (formerly Roamy) | IG/TikTok → map → day-by-day itinerary for your number of days | iOS | About 3.2K ratings at 4.8; Pro $9.99–$14.99/month or $29.99–$49.99/year; reached #10 top-grossing Travel on one App Store chart in March 2026; reviews raise billing and support complaints |
| Go There | Forward IG DMs, reels, stories, TikTok, YouTube or Maps links → map; AI trip plans; checks places against Google Places | iOS, Android | Six languages; founder reports organic growth; "save from a DM" is their wow moment |
| Plotline | Posts, reviews and Maps links → map with the creator's context on each pin | iOS (Android store link appears to exist) | Third-party estimate: about 20K installs, about $60K revenue |
| DocentPro | IG/TikTok/YouTube/Facebook/screenshots → AI itinerary → hotel booking | iOS, Android | Most complete feature set |
| Tripsy | Reel → places, with a tool to swap wrong places | iOS | Shows accuracy is a known problem |
| TripSpire | TikTok → guide | iOS | $6.99/month price point |
| Korka | Food only: IG/TikTok restaurant saves → personal map, share a city list by link | iPhone | Sells "no subscription" |
| Reelpin | IG reels → searchable library with summaries, transcripts and map pins | Android | General "save graveyard" tool |
| MapDreamy | Share a reel → map, plus a discovery feed | Android | Direct Android rival |
| Echo | Saves places from IG/TikTok/Facebook straight into Google Maps | Mobile, web | Shows demand for Google Maps interop |
| Triply, glide, ReelsMap, Everyplace, YK, ReelSave, GeoTok, TokSpot, ReelTravel, Nifl, Pintra | Variations on the same idea | Mostly iOS | The category is crowded |

**Planners (adjacent).** Wanderlog (full planner, collaboration; Pro $39.99/year; reviews complain about clutter and paywalled dark mode). Mindtrip and Layla (chat → itinerary → booking; Mindtrip can import places from TikTok, Instagram and YouTube links and pays creators for sign-ups).

**Platforms (the big threat).**
- **Google Maps** reads places from your screenshots into a "Screenshots" list (iOS first, off by default) and launched Ask Maps itineraries in the US and India in March 2026.
- **The Gemini app** can show places from a chat on a map and export them to a Google Maps list.
- **Instagram Map** (August 2025) shows friends' locations and location-tagged posts. It isn't a saved-places tool, but it shows Meta cares about places.

### 7.2 What the market tells us

1. **Demand is real.** Dozens of builders hit the same personal pain, and Rhyme's grossing rank shows people pay for it.
2. **The generic pitch is taken.** "Share a reel → pin on a map → AI itinerary" is now table stakes. Being slightly calmer or slightly faster won't win on its own.
3. **Almost everyone positions as travel.** Travel happens a few times a year, so these apps are used in bursts. That hurts retention and makes subscriptions feel expensive.
4. **Most capture reads captions only.** Places named only on screen or out loud get missed or guessed.
5. **Rivals lock you in.** Few export cleanly to the app people actually navigate with.
6. **Pricing trust is a weak spot.** Billing complaints and "no subscription" marketing both point the same way.
7. **Google is the long-term risk.** If Maps adds "share a reel to Maps", the plain capture feature becomes free for everyone.

### 7.3 Gaps Barabula can fill

| # | Gap | Evidence | Who's closest | How Barabula fills it |
|---|---|---|---|---|
| G1 | **Weekly use at home**, not just trips | Rivals sell travel; food reels are mostly local | Korka, YK (iPhone, food only) | "Tonight": open now, near me, from my saves (P2) |
| G2 | **Hard reels**: place named only on screen or out loud | Caption-only extraction; Tripsy's swap tool | Google Maps (screenshots only) | Your own screen recording → Gemini reads speech and on-screen text (P3) |
| G3 | **Phone + laptop** | Rivals are mobile apps | Mindtrip (web, but planner-first) | PWA: capture on phone, plan on a big screen |
| G4 | **Interop and portability** | Users navigate in Google Maps | Echo | Free CSV/KML export, "Open in Google Maps" for a place or a whole day (P4) |
| G5 | **Shareable without an install** | Sharing usually needs the recipient to install | Korka (share link) | Public list pages that open in any browser and can be found by search (P5) |
| G6 | **Honest pricing** | Billing complaints; "no subscription" pitches | Korka | Trip Pass, clear renewal date, one-tap cancel, basics always free |
| G7 | **Platform-safe capture** | Some rivals say they "analyse the video", which may mean downloading it | — | Official oEmbed + user-shared files only; nothing to get banned for |
| G8 | **On-trip use** | Most apps stop at the map or the plan | Nifl (near-me reminders) | Today view, offline, directions |

No single gap is a moat. Together — especially G1 + G2 + G3 — they describe a product nobody else is building.

### 7.4 Niche options

| | A. Own-city food & going-out first, trips second **(recommended)** | B. India-first, Android | C. Dietary-fit travellers (vegetarian, vegan, halal) | D. Status quo: travel reels → plan |
|---|---|---|---|---|
| Competition | Low–medium (Korka, YK are iPhone-only) | Medium (Google Ask Maps in India; glide is Indian but iOS) | Low | High (20+ apps) |
| How often it's used | Weekly | Weekly to monthly | Trip-based | A few times a year |
| Willingness to pay | Medium | Low per user (₹199 price point) | Medium–high | Medium |
| Fit with Asmeen | Strong: own use, friends, Android, data skills | Depends on where friends are; huge Android and Instagram base (551M Instagram users in July 2026) | Needs reliable dietary data, which is hard | Strong, but crowded |
| Build cost on top of the handover | Small (Tonight view, home-city load) | Medium (FSQ coverage checks, UPI payments, Hinglish captions) | Large (dietary data and checks) | None |
| Main risk | Google Maps already strong for local | Monetisation; data coverage | Wrong dietary info is harmful | Undifferentiated |

### 7.5 Decision (5 October 2026)

**Trips-first, with Tonight in v1. Keep option B (India) open.** This replaces the earlier recommendation of option A (own-city first). It is a sharper version of option D, with option A's Tonight view as the second use.

> For Android and laptop users who save travel and food reels and can't find them when it counts, Barabula turns the places you saved into a trip you actually follow — and shows what's open near you tonight when you're home. Unlike reels-to-map apps that stop at pins or only work on iPhone, it reads the hard reels from your own screen recording, works on phone and laptop, and exports everything to Google Maps.

Why trips lead (from a `/gsd-explore` session with Asmeen):
- Asmeen takes 6+ trips a year, so trips alone give regular use for the first user, which option D's "a few times a year" assumption missed.
- Saving already works for Asmeen. The pain is finding saves again, and the moment that happens is trip planning.
- Saves are about half local, half travel. The local half has no moment that brings it back, so Tonight ships in v1 (phase 19) to test whether it creates one.
- It reuses the existing itinerary engine as the core, not the second use.

What's different from option D's crowded pitch: hard reels via screen recording (G2, P3), phone + laptop (G3), Google Maps export (G4, P4), shareable list pages (G5, P5), honest pricing (G6), and Tonight at home (G1, P2).

**What would change this:** if the phase 15 eval shows screen recordings don't beat captions on hard reels (drop the G2 claim); if Tonight goes unused in normal weeks at home (drop it and lean on trips plus sharper pricing); if friends turn out to take far fewer trips than Asmeen (reconsider option A); if early users are mostly in India (move toward option B).

---

## 8. Business model

Switched on only after phase 19 (decision D9). Detail in handover section 13.

| Plan | UK | US | India | Includes |
|---|---|---|---|---|
| Free | £0 | $0 | ₹0 | Unlimited manual saves, 15 link captures a month, Tonight *(proposed)*, 1 planned trip, 5 Asks a month, share links, dark mode, export |
| Plus monthly | £3.99 | $4.99 | ₹199 | Unlimited captures and trips, Ask, screen-recording capture, offline trips |
| Plus annual | £24.99 | $29.99 | ₹1,299 | Same |
| Trip Pass (30 days) | £4.99 | $5.99 | ₹249 | Plus for one trip, no renewal |

- Priced below Rhyme ($9.99–$14.99/month) and Wanderlog Pro ($39.99/year) on purpose.
- Affiliate links (activities, hotels) labelled clearly and never used to rank places.
- Honest billing is part of the product: renewal date and cancel link always visible.
- Expect small numbers: roughly £120/month at 1,000 monthly users with 3% paying (handover estimate).

## 9. Success metrics

| Stage | Metric | Target |
|---|---|---|
| Phase 15 | Capture accuracy on the 50-link test set (split by caption / on-screen / spoken) | ≥ 70% overall |
| Phase 17 | Share → pin time | p90 ≤ 10 s |
| Phase 16–19 | Asmeen stops using each app's saved folder | Yes |
| Phase 19 | Used for a whole real trip | Yes |
| 60 days with friends | People who come back weekly (with Tonight) | ≥ 10 |
| Phase 20 | First payment or commission | 1 |

## 10. Getting users

1. **Friends first.** Asmeen and friends use it for real; nothing is promoted until phase 19 passes.
2. **Shared list pages.** Every shared list ("Asmeen's London cheap eats") is a web page anyone can open and save from. This is the main growth loop (P5).
3. **Communities, not launch sites.** City food and travel subreddits, local WhatsApp and Discord groups. Product Hunt and similar sites are full of near-identical apps.
4. **Creators (later).** A creator can turn their reels into a Barabula list for their bio link. Only after the core loop works.

## 11. Risks

| Risk | Likelihood | Impact | Response |
|---|---|---|---|
| Meta terms don't allow caption extraction (V2) | Medium–high | High | Captions behind a flag (P1); screen recordings and embeds as the main path |
| Google Maps adds "share a reel to Maps" | Medium | High | Lean on what Google won't do: calm UI, cross-platform saves, Tonight from *your* list, export |
| Place matching is wrong too often | Medium | High | Review card, one-tap fix, eval gate at 70%, fallback matcher (V14) |
| FSQ coverage weak in some cities | Medium | Medium | Check 50 known places per city (V13) |
| Hosting costs or free-tier limits | Medium | Low | City-subset loads; Supabase Pro at $25/month when friends join |
| Scope creep | High | Medium | Phases, gates, and the "ask first" list in the handover |
| Low retention because trips are rare | High without P2 | High | Tonight view (P2) |

## 12. Roadmap summary

| Phase | Outcome | Size |
|---|---|---|
| 14 Reset | Clean repo, per-trip chats, cost log, `CLAUDE.md` | 1 weekend |
| 15 Capture spike | Capture works on 50 real links; decide captions vs recordings | 1–2 weekends |
| 16 Saves and the map | Map home, review card, manual add, export, new visual system | 2 weekends |
| 17 Share from the phone | PWA share target, screenshots and recordings | 1 weekend |
| 18 Plan from saves | Day plans built around your saves | 2–3 weekends |
| 19 On the trip | Today view, near me, offline; Tonight at home *(proposed)* | 2 weekends |
| 20 Ask and money | Ask, checkout, affiliate links, public lists *(proposed)* | 2 weekends |

## 13. Sources (checked 5 October 2026)

- Rhyme / Roamy: https://apps.apple.com/us/app/6748781672 · https://apppricinglab.com/app/apple/6748781672 · https://marlvel.ai/api/llm/apps/travel/ai-fortheplot
- Go There: https://hunted.space/product/go-there · https://www.indiehackers.com/post/i-kept-dming-myself-instagram-reels-i-never-visited-so-i-built-an-app-that-turns-them-into-a-map-d4e737ac1d
- Plotline: https://marlvel.ai/api/llm/apps/travel/com-plotline-plotline · https://screensdesign.com/apps/plotline-travel-map-planner/
- Korka: https://mwm.ai/apps/korka-food-map/6762612703 · YK: https://mwm.ai/apps/yk-youknow/6759484614
- Reelpin: https://hunted.space/product/reelpin · Echo: https://peerpush.com/p/echo-your-travel-companion · Triply: https://peerpush.com/p/triply-ai-travel-planner
- glide: https://mwm.ai/apps/glide-organize-plan/6755294996 · ReelsMap: https://apps.apple.com/app/reelsmap/id6756835284 · Everyplace: https://mwm.ai/apps/everyplace-save-your-spots/6759034368
- Tripsy: https://www.mergeek.com/en/latest/K5lYgAMYq96A1wx2 · TripSpire: https://apps.apple.com/app/6753126737
- Mindtrip import from links: https://techcrunch.com/2024/07/31/travel-startup-mindtrips-new-feature-lets-you-build-an-itinerary-from-a-screenshot-youtube-or-tiktok-video
- Google Maps screenshots: https://9to5google.com/2025/03/27/google-maps-gemini-screenshots/ · Ask Maps: https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/
- Gemini app → Google Maps lists: https://support.google.com/gemini/answer/16622866
- Instagram Map: https://techcrunch.com/2025/08/06/instagram-takes-on-snapchat-with-new-instagram-map
- India Instagram audience: https://www.republicworld.com/initiatives/how-indians-are-saving-instagram-reels-and-videos-using-just-a-browser-link-in-2026-2026-09-03-136201
- Meta oEmbed Read allowed usage: https://developers.facebook.com/documentation/development/features-reference/meta-oembed-read
- Earlier sources (Wanderlog complaints, pricing benchmarks, renewal rates): see handover section 20.

Third-party app statistics (installs, revenue, ranks) are estimates from app-intelligence sites, not official figures.
