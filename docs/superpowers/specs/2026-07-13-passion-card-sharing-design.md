# Passion Card Public Sharing

**Date:** 2026-07-13
**Status:** Approved

## Overview

Allow passion cards to be shared via a generated URL that renders the card publicly — no authentication required for viewing.

## URL Format

```
/passion-card/{uuid}
```

Uses the existing card UUID. No slug generation or DB migration needed.

## Changes

### 1. New Page: `app/passion-card/[id]/page.tsx`

Public read-only view of a passion card.

- **Server component** — queries DB directly via `findById()` from the existing repository
- Fetches card data + joins `"user"` table to get the owner's username
- Renders the same visual as the owner's view:
  - Radar chart SVG (6 axes, concentric hexagonal grid, animated data polygon)
  - Archetype label + personality blurb
  - Favorites list (games, anime, artists)
- Shows owner's username: "{name}'s Fandom Profile"
- Includes download-as-PNG button (html-to-image)
- No regenerate, no input form, no share button (visitors don't own the card)
- 404 via `notFound()` if card ID not found

### 2. Share Button: `app/passion-card/page.tsx`

Added to the existing Actions section alongside Regenerate and Download.

- "Share" button with Material `link` icon
- On click: copies `${window.location.origin}/passion-card/${card.id}` to clipboard
- Visual feedback: button text briefly changes to "Copied!" for 2 seconds, then reverts
- Silent fallback if clipboard API unavailable

### 3. Repository Addition

`passion-card.repository.ts` — new `findPublicById(id)`:

```sql
SELECT p.*, u.name AS owner_name
FROM passion_cards p
JOIN "user" u ON p.user_id = u.id
WHERE p.id = $1
```

Returns the card data plus `ownerName` for display.

## Files Modified

| File | Change |
|---|---|
| `app/passion-card/[id]/page.tsx` | **New** — public card view |
| `app/passion-card/page.tsx` | Add share button to Actions |
| `app/api/passion-card/passion-card.repository.ts` | Add `findPublicById()` |

## Not Changed

- Existing API routes (all auth-gated endpoints untouched)
- DB schema (no migration)
- Card generation logic
- Types (reuse existing `PassionCard` + add `ownerName`)

## Error Handling

- Card not found → Next.js 404 page
- Clipboard API unavailable → silent no-op
- DB error → 500 page (standard Next.js)
