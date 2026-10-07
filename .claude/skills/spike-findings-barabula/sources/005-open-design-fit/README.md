---
spike: 005
idea: free-apis-and-open-design
name: open-design-fit
type: standard
validates: "Given the Gate Board direction, the Impeccable skill and the GSD HTML sketches, when Open Design (nexu-io/open-design) is reviewed read-only, then we know what it does, its licence and data flow, and whether it improves Barabula's UI work"
verdict: INVALIDATED
related: []
tags: [design-tools, ui, claude-code, privacy, open-design]
---

# Spike 005: Open Design fit

## What This Validates
Given the Gate Board + photo passes direction (phase 16), the Impeccable skill, GSD sketches (`.planning/sketches/`) and Claude Code,
when Open Design is reviewed read-only (GitHub API and web only: no clone, install or run, per Asmeen's choice),
then we know what it is, what it costs (money, privacy, security), and whether it helps Barabula design a better UI.

**Answer: no, not for phase 16.** Verdict INVALIDATED for the hypothesis "Open Design would improve Barabula's UI workflow now".
It might be worth a look near launch for promo video, store screenshots or decks.

## Research

Checked 6 Oct 2026 via `gh api` and the repo's own docs. Paths are relative to `github.com/nexu-io/open-design/blob/main/`.

### What it is
- **An Electron 41 desktop app** (`apps/desktop/package.json`). It wraps a Next.js 16 web UI and a local Node 24 daemon (Express + SQLite) on `127.0.0.1:7456`. It also ships an `od` CLI, a stdio MCP server and a Docker image.
- **The open-source copy of Anthropic's Claude Design.** You type a brief, pick a template and a design system (`DESIGN.md` + `tokens.css` + `manifest.json`), and it **starts your coding agent CLI as a subprocess** (Claude Code, Codex, Cursor and 26 runtimes in total) in a project folder it manages. The agent writes files, and a sandboxed iframe shows the preview. You comment, refine and export.
- **Outputs:** single-file HTML/CSS (default); decks as HTML, PDF or PPTX; images; MP4 video (HyperFrames); design-system packages.
- **Getting output into a Next.js app:** there is no converter. The `od-nextjs-export` plugin is only a prompt asking the agent to rebuild the HTML in React (`plugins/_official/scenarios/od-nextjs-export/SKILL.md`). "Refresh an existing codebase" and "Figma → React" are unchecked items on the roadmap.
- **Scale of content:** 163 skill folders, 114 design templates, 151 design systems (mostly copies of real brands: Stripe, Airbnb, Apple, Linear…), and 277 official plugins.

### Cost
| Item | Finding |
|---|---|
| Download | 382 MB (Mac Apple Silicon) to 417 MB (Windows), v0.24.1. Running from source: Node 24, pnpm 10.33, a ~3.5 GB repo. |
| Models | Your local agent CLI, your own API keys (Anthropic, OpenAI, Google, Ollama, Azure…), or the paid "OpenDesign Cloud / AMR" |
| Claude subscription | Starts your logged-in `claude`, so usage counts against your plan. Some features are API-key-only (open issue #963). Whether Anthropic's terms allow a third-party app to drive Claude Code headless: UNVERIFIED |
| Paid parts | App free. Image and video need provider keys or the Cloud ("Go" plan $8 for the first month per the v0.24.1 notes) |

### Privacy and security (verified by me against the repo, 6 Oct 2026)
- `PRIVACY.md`: "Usage telemetry is **on by default**". PostHog analytics plus privacy-masked session replay. The "Safety and reliability telemetry is **always enabled**" channel cannot be switched off.
- **Open bug #8560** (opened 1 Oct 2026): reloading during boot "re-enables telemetry after opt-out and wipes agentCliEnv".
- `docs/agent-adapters.md` line 531: "Claude runs with `--permission-mode bypassPermissions`", so the agent never asks before acting.
- **Open bug #4594** (21 Jun 2026): "projects are not isolated from one another" (an agent edited another project's files).
- `od mcp install claude` registers its MCP server for **every** Claude Code session on the machine (`claude mcp add --scope user`).

### Health
| Metric | Value |
|---|---|
| Created / latest release | 28 Apr 2026 / v0.24.1 on 24 Sep 2026 |
| Releases | 38 in about 5 months (v0.4.0 is titled "DO NOT USE") |
| Issues / PRs | 532 open, 1,590 closed / 623 open, 3,499 merged |
| Stars | 99.7k. The repo rewards starring (a "Spark" badge in `.vaunt/config.yaml`) and has a paid contributor programme, so the count is inflated by incentives. Whether the starring accounts are real: UNVERIFIED (the stargazer API returned 404) |
| Company | Open-core, VC-backed (Nexu). The README leads with the paid plan; open PR #7093 proposes an upsell pop-up |

### Approaches compared

| Approach | Tool | Pros | Cons | Status |
|---|---|---|---|---|
| Current loop | Impeccable skill + GSD sketches + UI-SPEC + Claude Code | Works on the **real** app (live browser iteration), already set up, no telemetry, no extra app | No canvas UI; variants are HTML sketches | **Keep** |
| Open Design | Desktop app driving Claude Code | Canvas-style iteration, many templates, tidy `DESIGN.md`/`tokens.css` packages, video/deck export | HTML mockups only, rebuilt by Claude Code anyway; telemetry on by default; `bypassPermissions`; isolation bug; Tailwind mapping is v4 only (Barabula is on Tailwind 3); ~400 MB; churn | Skip now |
| Claude Design (Anthropic) | claude.ai research preview (since 17 Apr 2026) | Builds a design system from your codebase; hands off to Claude Code as a bundle; nothing to install; no third-party telemetry | Uses plan limits; preview product; availability depends on plan (UNVERIFIED for Asmeen's plan) | Try first if a canvas tool is wanted |
| Copy single skills | Open Design `SKILL.md` folders | Agent Skills format; can be copied | Many depend on Open Design's own injection; `impeccable-design-polish` is "inspired by Impeccable" and uses the trigger word "impeccable", so it would **collide** with the installed Impeccable skill | Skip |

**Chosen approach:** keep the current loop. If a canvas tool is ever wanted, try Claude Design before Open Design.

## How to Run
Nothing to run: this spike was read-only by request. Evidence lives in the repo paths and issue numbers above.

## What to Expect
N/A (research verdict).

## Investigation Trail
1. Repo metadata (gh API): Apache-2.0, 99.7k stars, created 28 Apr 2026, ~3.5 GB, so cloning was ruled out even before Asmeen chose read-only.
2. Subagent read the README, docs, tree, package.json files, PRIVACY.md, issues and releases (66 tool calls, about 9.5 min).
3. I re-checked the deciding claims myself: `PRIVACY.md` lines 14–30 (on by default; one channel always on), `docs/agent-adapters.md` lines 194 and 531 (`bypassPermissions`), issues #8560, #4594, #963 open, 38 releases, latest v0.24.1 on 24 Sep 2026. All confirmed.
4. Fit check against phase 16 (`16-UI-SPEC.md`): the hard parts of Gate Board are production React work (split-flap motion with Motion, Base UI sheets, MapLibre, real photos, light + dark tokens on Tailwind 3). Open Design only makes HTML stand-ins for these.

## Results
**Verdict: INVALIDATED (skip for phase 16).** Three reasons decide it:
1. **Nothing new where it matters.** It gives HTML mockups plus a "convert to Next.js" prompt for Claude Code. That is the loop Barabula already has, with a 400 MB app in between, and Impeccable works on the real running app instead.
2. **Real privacy and security cost.** Telemetry and session replay are on by default and one channel can't be switched off. An open bug silently turns telemetry back on. Claude Code runs with `bypassPermissions`, and another open bug lets an agent touch other projects. That conflicts with the "never edit data without asking" spirit of the project.
3. **Unstable and commercially driven.** 38 releases in 5 months, 532 open issues, an upsell funnel and incentives to star.

**Surprises:** it ships a skill named after Impeccable that would collide with Asmeen's installed one, and its brand design systems are look-alikes of real companies.

**If Asmeen still wants to try it** (about an hour, sandboxed): install the Mac app, choose "Don't share" on first run and don't reload during boot (#8560); use Claude Code as the runtime; **do not** run `od mcp install claude`; never point a project at the Barabula repo; build one small Gate Board design system (Tag yellow, Atkinson/Geist Mono, light + dark), generate 2–3 mobile screens and compare them with `.planning/sketches/16-directions/`; then uninstall and delete the app's data.
