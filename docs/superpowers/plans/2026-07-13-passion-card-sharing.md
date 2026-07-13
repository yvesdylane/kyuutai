# Passion Card Public Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow passion cards to be shared via a public URL that renders the card without authentication.

**Architecture:** Add a `findPublicById()` repository method that joins the user table for the owner's name, create a new server-rendered page at `/passion-card/[id]` for public viewing, and add a clipboard-copy share button to the existing passion card page.

**Tech Stack:** Next.js 16 App Router, React 19, PostgreSQL (raw SQL), html-to-image

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `app/api/passion-card/passion-card.repository.ts` | Modify | Add `findPublicById()` with user JOIN |
| `app/passion-card/[id]/page.tsx` | Create | Public card view (server component) |
| `app/passion-card/page.tsx` | Modify | Add share button to Actions section |

---

### Task 1: Add `findPublicById` to repository

**Files:**
- Modify: `app/api/passion-card/passion-card.repository.ts:33-39`

- [ ] **Step 1: Add the new function after `findById`**

Add this function at the end of `app/api/passion-card/passion-card.repository.ts`:

```typescript
export interface PublicPassionCard extends PassionCard {
  ownerName: string
}

export async function findPublicById(
  id: string
): Promise<PublicPassionCard | null> {
  const result = await pool.query(
    `SELECT p.*, u.name AS owner_name
     FROM passion_cards p
     JOIN "user" u ON p.user_id = u.id
     WHERE p.id = $1`,
    [id]
  )
  if (!result.rows[0]) return null
  const row = result.rows[0]
  return {
    ...mapRow(row),
    ownerName: row.owner_name ?? "Anonymous",
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/passion-card/passion-card.repository.ts
git commit -m "feat: add findPublicById to passion card repository"
```

---

### Task 2: Create public passion card page

**Files:**
- Create: `app/passion-card/[id]/page.tsx`

- [ ] **Step 1: Create the page file**

Create `app/passion-card/[id]/page.tsx` with the following content. This is a **server component** that queries the DB directly (no auth required):

```tsx
import { notFound } from "next/navigation"
import { findPublicById } from "@/app/api/passion-card/passion-card.repository"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const card = await findPublicById(id)
  if (!card) return { title: "Card Not Found — Kyuutai" }
  return {
    title: `${card.ownerName}'s Passion Card — Kyuutai`,
    description: `${card.archetype} — ${card.blurb.slice(0, 120)}...`,
  }
}

export default async function PublicPassionCardPage({ params }: Props) {
  const { id } = await params
  const card = await findPublicById(id)
  if (!card) notFound()

  return (
    <div className="min-h-screen bg-background text-on-background font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="flex justify-center items-center w-full px-5 h-16 bg-surface/90 backdrop-blur-sm fixed top-0 z-40">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-on-surface">
          {card.ownerName}&apos;s Fandom Profile
        </h1>
      </header>

      <main className="pt-24 pb-16 px-5 max-w-2xl mx-auto space-y-4">
        {/* Radar Chart */}
        <section className="relative bg-surface-container-low rounded-xl p-6 paper-grain shadow-xl border border-outline-variant/20 transform rotate-1">
          <div className="washi-tape absolute -top-3 left-1/2 -translate-x-1/2" />
          <div className="flex flex-col items-center">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary mb-4 self-start">
              Passion Radar
            </h2>
            <div className="relative w-full aspect-square flex items-center justify-center max-w-[300px]">
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* Grid */}
                <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                <polygon points="50,20 80,37 80,63 50,80 20,63 20,37" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                <polygon points="50,35 65,43 65,57 50,65 35,57 35,43" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                {/* Axes */}
                {[0, 60, 120, 180, 240, 300].map((angleDeg, i) => {
                  const rad = (angleDeg - 90) * (Math.PI / 180)
                  const x2 = 50 + 45 * Math.cos(rad)
                  const y2 = 50 + 45 * Math.sin(rad)
                  return (
                    <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.3" className="text-outline-variant opacity-20" />
                  )
                })}
                {/* Data polygon */}
                {card.radarAxes.length === 6 && (() => {
                  const points = card.radarAxes
                    .map((a, i) => {
                      const angle = (i * 60 - 90) * (Math.PI / 180)
                      const r = (a.score / 100) * 45
                      return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`
                    })
                    .join(" ")
                  return (
                    <polygon
                      points={points}
                      fill="rgba(203, 190, 255, 0.4)"
                      stroke="#cbbeff"
                      strokeWidth="2"
                      className="radar-data-polygon"
                    />
                  )
                })()}
              </svg>
              {/* Labels */}
              {card.radarAxes.map((a, i) => {
                const angle = (i * 60 - 90) * (Math.PI / 180)
                const x = 50 + 55 * Math.cos(angle)
                const y = 50 + 55 * Math.sin(angle)
                return (
                  <span
                    key={i}
                    className="absolute font-[family-name:var(--font-label)] text-[10px] text-on-surface-variant -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {a.axis}
                  </span>
                )
              })}
            </div>
          </div>
        </section>

        {/* Personality Blurb */}
        <section className="bg-surface-container-high rounded-xl p-6 paper-grain shadow-xl border border-outline-variant/30 transform -rotate-1">
          <div className="flex flex-col mb-2">
            <span className="font-[family-name:var(--font-label)] text-[10px] text-tertiary-fixed uppercase tracking-widest mb-1">
              Archetype
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary">
              {card.archetype}
            </h3>
          </div>
          <div className="dotted-line my-4" />
          <p className="font-[family-name:var(--font-body)] text-on-surface leading-relaxed italic">
            &ldquo;{card.blurb}&rdquo;
          </p>
        </section>

        {/* Favorites */}
        <FavoritesSection card={card} />
      </main>
    </div>
  )
}

function FavoritesSection({
  card,
}: {
  card: { games: string[]; anime: string[]; artists: string[] }
}) {
  const categories = [
    { key: "games" as const, label: "Top Games", icon: "sports_esports", color: "text-primary" },
    { key: "anime" as const, label: "Top Anime", icon: "movie", color: "text-[#02a9ff]" },
    { key: "artists" as const, label: "Favorite Artists", icon: "music_note", color: "text-[#1DB954]" },
  ]

  return (
    <section className="bg-surface-container p-6 rounded-xl border border-dotted border-outline-variant relative overflow-hidden">
      <h4 className="font-[family-name:var(--font-display)] text-lg font-semibold text-primary mb-4">
        Favorites
      </h4>
      <div className="space-y-3">
        {categories.map(({ key, label, icon, color }) => {
          const items = card[key]
          return (
            items.length > 0 && (
              <div key={key} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/10">
                <span className={`material-symbols-outlined ${color}`}>{icon}</span>
                <div>
                  <span className="text-xs text-on-surface-variant font-medium">{label}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {items.map((item) => (
                      <span key={item} className="bg-surface-container-highest text-on-surface px-2 py-0.5 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          )
        })}
      </div>
      <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
        <span className="material-symbols-outlined text-[120px]">hub</span>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/passion-card/nonexistent`
Expected: 404 (the page compiles and `notFound()` fires for invalid IDs)

- [ ] **Step 3: Commit**

```bash
git add app/passion-card/\[id\]/page.tsx
git commit -m "feat: add public passion card page at /passion-card/[id]"
```

---

### Task 3: Add share button to existing page

**Files:**
- Modify: `app/passion-card/page.tsx:235-248`

- [ ] **Step 1: Add share handler and button**

In `app/passion-card/page.tsx`, add a `copied` state and share handler. Insert the share button between the Regenerate and Download buttons.

Add state (after line 71):
```typescript
const [copied, setCopied] = useState(false)
```

Add handler (after `handleDownload`, around line 122):
```typescript
async function handleShare() {
  if (!card) return
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/passion-card/${card.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch {
    // silent fallback
  }
}
```

Replace the Actions section (lines 235-248) with:
```tsx
{/* Actions */}
<button
  onClick={() => { setCard(null) }}
  className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl hover:bg-surface-container transition-colors"
>
  Regenerate
</button>
<button
  onClick={handleShare}
  className="w-full flex items-center justify-center gap-2 bg-surface-container-high text-on-surface py-3 rounded-xl hover:bg-surface-container-highest transition-colors"
>
  <span className="material-symbols-outlined">{copied ? "check" : "link"}</span>
  {copied ? "Copied!" : "Share Card"}
</button>
<button
  onClick={handleDownload}
  className="w-full flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container py-3 rounded-xl hover:bg-secondary-container/80 transition-colors"
>
  <span className="material-symbols-outlined">download</span>
  Download Card
</button>
```

- [ ] **Step 2: Commit**

```bash
git add app/passion-card/page.tsx
git commit -m "feat: add share button to passion card page"
```

---

### Task 4: Verify end-to-end

- [ ] **Step 1: Start dev server and test**

```bash
# Check public page renders 404 for bad ID
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/passion-card/nonexistent
# Expected: 404

# Check passion card page loads (will show input form or existing card)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/passion-card
# Expected: 200
```

- [ ] **Step 2: Verify in browser**

1. Go to `/passion-card` — generate or load an existing card
2. Click "Share Card" — should show "Copied!" briefly
3. Open the copied URL in an incognito window — should show the card publicly with owner name
4. Verify radar chart, archetype, blurb, and favorites all render
5. Verify 404 page shows for invalid card IDs
