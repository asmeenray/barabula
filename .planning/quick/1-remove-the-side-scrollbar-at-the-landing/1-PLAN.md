---
id: "001"
slug: "remove-the-side-scrollbar-at-the-landing"
description: "remove the side scrollbar at the landing page. make it more subtle (invisible)"
---

# Quick Task 001: Remove Landing Page Scrollbar

## Task

Hide the page-level scrollbar (`html` element) on the landing page while preserving inner element scrollbars (chat panel, etc.).

## Implementation

Edit `src/app/globals.css`:
- Add `html::-webkit-scrollbar { display: none }` to hide webkit scrollbar on page scroll
- Add `html { scrollbar-width: none }` for Firefox
- Keep inner element scrollbars (3px, ultra-subtle) via `::-webkit-scrollbar` targeting child elements
