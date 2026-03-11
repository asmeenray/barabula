---
status: complete
---

# Summary: Remove Landing Page Scrollbar

## What was done

Edited `src/app/globals.css` to hide the page-level scrollbar on the `html` element:

- `html::-webkit-scrollbar { display: none }` — removes scrollbar in Chrome/Safari
- `html { scrollbar-width: none }` — removes scrollbar in Firefox
- Inner element scrollbars (chat panel thread, etc.) preserved at 3px ultra-subtle via `::-webkit-scrollbar` on child elements

## Result

Landing page scrollbar is now invisible. Chat panel and other inner scrollable areas retain their subtle 3px scrollbar.
