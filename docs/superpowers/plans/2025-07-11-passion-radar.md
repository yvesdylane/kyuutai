# Passion Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Passion Radar feature — a taste-fusion profile generator that creates a shareable hexagonal radar chart with AI-determined axes, archetype, personality blurb, and voice narration.

**Architecture:** Single-shot generation flow. User enters favorites → POST API → Gemini (axes + archetype + blurb) → ElevenLabs (voice) → DB → render. Follows existing route → service → repository pattern.

**Tech Stack:** Next.js 16 App Router, raw SQL via pg, Google Gemini AI, ElevenLabs TTS, html-to-image for PNG export, SVG for radar chart.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `types/passion-card.ts` | Rewrite | RadarAxis, PassionCard, GeneratePassionCardRequest |
| `app/api/passion-card/passion-card.repository.ts` | Create | Raw SQL CRUD + mapRow |
| `lib/gemini.ts` | Modify | Add `generatePassionProfile()` |
| `app/api/passion-card/passion-card.service.ts` | Create | Orchestration: Gemini → ElevenLabs → DB |
| `app/api/passion-card/route.ts` | Create | GET (latest) + POST (generate) |
| `app/api/passion-card/[id]/route.ts` | Create | GET by ID (sharing) |
| `app/passion-card/page.tsx` | Create | Main page with input form + result view |
| `app/devotion-log/page.tsx` | Modify | Add Radar tab to bottom nav |
| `app/devotion-log/timeline/page.tsx` | Modify | Add Radar tab to bottom nav |
| `app/devotion-log/recap/page.tsx` | Modify | Add Radar tab to bottom nav |
| `package.json` | Modify | Add `html-to-image` dependency |

---

### Task 1: Database — Create `passion_cards` table

- [ ] **Step 1: Create the table**

```bash
PGPASSWORD='pwd$4$Postgres' psql -U postgres -d postgres -c "
CREATE TABLE passion_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  games         TEXT[] NOT NULL,
  anime         TEXT[] NOT NULL,
  artists       TEXT[] NOT NULL,
  radar_axes    JSONB NOT NULL,
  archetype     TEXT NOT NULL,
  blurb         TEXT NOT NULL,
  audio_url     TEXT,
  obsession_id  UUID REFERENCES journal_entries(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
"
```

- [ ] **Step 2: Verify table exists**

```bash
PGPASSWORD='pwd$4$Postgres' psql -U postgres -d postgres -c "\d passion_cards"
```

Expected: table with all columns listed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): create passion_cards table"
```

---

### Task 2: Types — Update `types/passion-card.ts`

- [ ] **Step 1: Rewrite the file**

Replace contents of `types/passion-card.ts`:

```ts
export interface RadarAxis {
  axis: string
  score: number
}

export interface PassionCard {
  id: string
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
  radarAxes: RadarAxis[]
  archetype: string
  blurb: string
  audioUrl: string | null
  obsessionId: string | null
  createdAt: string
  updatedAt: string
}

export interface GeneratePassionCardRequest {
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
}
```

- [ ] **Step 2: Update `types/index.ts`**

Replace the passionCard export line:

```ts
export type { PassionCard, RadarAxis, GeneratePassionCardRequest } from "./passionCard"
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -10
```

Expected: TypeScript passes (may fail on missing imports in later files — that's fine).

- [ ] **Step 4: Commit**

```bash
git add types/ && git commit -m "feat(types): add PassionCard, RadarAxis, GeneratePassionCardRequest"
```

---

### Task 3: Repository — `app/api/passion-card/passion-card.repository.ts`

- [ ] **Step 1: Create the repository file**

```ts
import pool from "@/lib/db"
import type { PassionCard } from "@/types/passion-card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PassionCard {
  return {
    id: row.id,
    userId: row.user_id,
    games: row.games ?? [],
    anime: row.anime ?? [],
    artists: row.artists ?? [],
    radarAxes: row.radar_axes ?? [],
    archetype: row.archetype,
    blurb: row.blurb,
    audioUrl: row.audio_url,
    obsessionId: row.obsession_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findLatestByUserId(
  userId: string
): Promise<PassionCard | null> {
  const result = await pool.query(
    "SELECT * FROM passion_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function findById(id: string): Promise<PassionCard | null> {
  const result = await pool.query(
    "SELECT * FROM passion_cards WHERE id = $1",
    [id]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function create(data: {
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
  radarAxes: { axis: string; score: number }[]
  archetype: string
  blurb: string
  audioUrl: string | null
  obsessionId: string | null
}): Promise<PassionCard> {
  const result = await pool.query(
    `INSERT INTO passion_cards (user_id, games, anime, artists, radar_axes, archetype, blurb, audio_url, obsession_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.userId,
      data.games,
      data.anime,
      data.artists,
      JSON.stringify(data.radarAxes),
      data.archetype,
      data.blurb,
      data.audioUrl,
      data.obsessionId,
    ]
  )
  return mapRow(result.rows[0])
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/passion-card/ && git commit -m "feat(api): add passion-card repository with mapRow"
```

---

### Task 4: Gemini — Add `generatePassionProfile()` to `lib/gemini.ts`

- [ ] **Step 1: Add the new function**

Append to `lib/gemini.ts` (after existing `generateRecapScript`):

```ts
export async function generatePassionProfile(favorites: {
  games: string[]
  anime: string[]
  artists: string[]
}): Promise<{
  axes: { axis: string; score: number }[]
  archetype: string
  blurb: string
}> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

  const prompt = `Analyze these favorites and produce a passion profile.

Games: ${favorites.games.join(", ")}
Anime: ${favorites.anime.join(", ")}
Artists: ${favorites.artists.join(", ")}

Return ONLY valid JSON:
{
  "axes": [
    {"axis": "emotion name", "score": 0-100}
  ],
  "archetype": "The [Adjective] [Noun]",
  "blurb": "2-3 sentence personality description, spoken-word style, referencing specific titles from the lists"
}

Rules:
- Axes must be exactly 6, emotionally meaningful, specific to these favorites
- Scores reflect intensity (0=none, 100=dominant trait)
- Archetype should feel like a character class or anime title
- Blurb should feel like a narrator describing someone's soul
- Keep blurb under 60 words
- Reference at least 2 specific titles in the blurb
- Return ONLY the JSON object, no markdown, no explanation`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON")
  }

  return JSON.parse(jsonMatch[0])
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -10
```

Expected: TypeScript passes.

- [ ] **Step 3: Commit**

```bash
git add lib/gemini.ts && git commit -m "feat(lib): add generatePassionProfile to Gemini client"
```

---

### Task 5: Service — `app/api/passion-card/passion-card.service.ts`

- [ ] **Step 1: Create the service file**

```ts
import { findLatestByUserId, create } from "./passion-card.repository"
import { findManyByUserId } from "../journal/journal.repository"
import { generatePassionProfile } from "@/lib/gemini"
import { textToSpeech } from "@/lib/elevenlabs"
import type { GeneratePassionCardRequest } from "@/types/passion-card"

export async function generatePassionCard(req: GeneratePassionCardRequest) {
  const { userId, games, anime, artists } = req

  if (!games.length || !anime.length || !artists.length) {
    throw new Error("Please add at least one item to each category")
  }

  // Generate profile with Gemini
  const profile = await generatePassionProfile({ games, anime, artists })

  // Find most recent journal entry for "Current Obsession"
  const entries = await findManyByUserId(userId)
  const obsessionId = entries.length > 0 ? entries[0].id : null

  // Generate voice narration (non-blocking — card saves without audio on failure)
  let audioUrl: string | null = null
  try {
    audioUrl = await textToSpeech(profile.blurb)
  } catch {
    // ElevenLabs failure is non-fatal
  }

  // Save to database
  const card = await create({
    userId,
    games,
    anime,
    artists,
    radarAxes: profile.axes,
    archetype: profile.archetype,
    blurb: profile.blurb,
    audioUrl,
    obsessionId,
  })

  return card
}

export async function getLatestPassionCard(userId: string) {
  return findLatestByUserId(userId)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/passion-card/passion-card.service.ts && git commit -m "feat(api): add passion-card service with generation flow"
```

---

### Task 6: API Routes

- [ ] **Step 1: Create `app/api/passion-card/route.ts`**

```ts
import { NextRequest } from "next/server"
import { generatePassionCard, getLatestPassionCard } from "./passion-card.service"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 })
  }

  const card = await getLatestPassionCard(userId)
  return Response.json({ data: card })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, games, anime, artists } = body

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    const card = await generatePassionCard({ userId, games, anime, artists })
    return Response.json({ data: card }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate passion card"
    const status = message.includes("at least one") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
```

- [ ] **Step 2: Create `app/api/passion-card/[id]/route.ts`**

```ts
import { NextRequest } from "next/server"
import { findById } from "../passion-card.repository"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const card = await findById(id)

  if (!card) {
    return Response.json({ error: "Passion card not found" }, { status: 404 })
  }

  return Response.json({ data: card })
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -15
```

Expected: All routes compile. TypeScript passes.

- [ ] **Step 4: Commit**

```bash
git add app/api/passion-card/ && git commit -m "feat(api): add passion-card GET/POST routes"
```

---

### Task 7: Test API Endpoints

- [ ] **Step 1: Start dev server**

```bash
npx next dev -p 3001 -H 0.0.0.0
```

- [ ] **Step 2: Test GET (no card yet)**

```bash
curl -s http://localhost:3001/api/passion-card?userId=user1
```

Expected: `{"data":null}`

- [ ] **Step 3: Test POST (generate card)**

```bash
curl -s -X POST http://localhost:3001/api/passion-card \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","games":["Elden Ring","Celeste","Hollow Knight"],"anime":["Mushishi","March Comes in Like a Lion"],"artists":["Explosions in the Sky","Boards of Canada"]}'
```

Expected: 201 with full PassionCard JSON including `radarAxes`, `archetype`, `blurb`, `audioUrl`.

- [ ] **Step 4: Test GET (after generation)**

```bash
curl -s http://localhost:3001/api/passion-card?userId=user1
```

Expected: Returns the card just created.

- [ ] **Step 5: Test validation**

```bash
curl -s -X POST http://localhost:3001/api/passion-card \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","games":[],"anime":["Mushishi"],"artists":["Boards of Canada"]}'
```

Expected: 400 with `"Please add at least one item to each category"`.

- [ ] **Step 6: Kill dev server**

```bash
kill $(pgrep -f "next dev")
```

---

### Task 8: UI Page — Input Form

- [ ] **Step 1: Create `app/passion-card/page.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { PassionCard } from "@/types/passion-card"

type Category = "games" | "anime" | "artists"

const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; placeholder: string; color: string }> = {
  games: { label: "Top Games", icon: "sports_esports", placeholder: "e.g. Elden Ring, Celeste, Hades...", color: "text-primary" },
  anime: { label: "Top Anime", icon: "movie", placeholder: "e.g. Mushishi, Evangelion, Spy x Family...", color: "text-[#02a9ff]" },
  artists: { label: "Favorite Artists", icon: "music_note", placeholder: "e.g. Explosions in the Sky, Radiohead...", color: "text-[#1DB954]" },
}

function TagInput({ category, tags, onChange }: { category: Category; tags: string[]; onChange: (tags: string[]) => void }) {
  const config = CATEGORY_CONFIG[category]
  const [input, setInput] = useState("")

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput("")
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-on-surface">{config.label}</span>
        <span className="text-xs text-on-surface-variant">({tags.length})</span>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 min-h-[52px]">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-error transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? config.placeholder : "Add more..."}
          className="flex-1 min-w-[120px] bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant/50 text-sm"
        />
      </div>
    </div>
  )
}

export default function PassionCardPage() {
  const [card, setCard] = useState<PassionCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [games, setGames] = useState<string[]>([])
  const [anime, setAnime] = useState<string[]>([])
  const [artists, setArtists] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/passion-card?userId=user1")
        const data = await res.json()
        if (!cancelled && res.ok && data.data) {
          setCard(data.data)
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/passion-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user1", games, anime, artists }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate")
      setCard(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate = games.length > 0 && anime.length > 0 && artists.length > 0

  return (
    <div className="min-h-screen bg-background text-on-background relative font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-5 h-16 bg-surface/90 backdrop-blur-sm fixed top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-on-surface">
            Passion Card
          </h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        ) : card ? (
          /* TODO: Result view (Task 9) */
          <div>Result view placeholder</div>
        ) : (
          /* Input Form */
          <div className="space-y-6">
            <p className="text-on-surface-variant text-sm">
              Enter your top favorites and let AI discover your emotional through-line.
            </p>

            <TagInput category="games" tags={games} onChange={setGames} />
            <TagInput category="anime" tags={anime} onChange={setAnime} />
            <TagInput category="artists" tags={artists} onChange={setArtists} />

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="w-full bg-primary text-on-primary text-lg font-medium py-4 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Analyzing your taste universe...
                </span>
              ) : (
                "Generate My Radar"
              )}
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-container/90 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.4)] rounded-t-xl flex justify-around items-center px-4 pb-6 pt-3">
        <Link href="/devotion-log" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">edit_note</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Journal</span>
        </Link>
        <Link href="/devotion-log/timeline" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">auto_stories</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Timeline</span>
        </Link>
        <Link href="/devotion-log/recap" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">graphic_eq</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Recap</span>
        </Link>
        <div className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Radar</span>
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/passion-card/ && git commit -m "feat(ui): add passion card input form with tag inputs"
```

---

### Task 9: UI Page — Result View with Radar Chart

- [ ] **Step 1: Replace the result view placeholder in `app/passion-card/page.tsx`**

Replace `{/* TODO: Result view (Task 9) */}` and the placeholder div with the full result view. The result view should render when `card` is non-null:

```tsx
/* Result View */
<div className="space-y-4">
  {/* Radar Chart */}
  <section className="relative bg-surface-container-low rounded-xl p-6 paper-grain shadow-xl border border-outline-variant/20 transform rotate-1">
    <div className="washi-tape absolute -top-3 left-1/2 -translate-x-1/2" />
    <div className="flex flex-col items-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary mb-4 self-start">Passion Radar</h2>
      <div className="relative w-full aspect-square flex items-center justify-center max-w-[300px]">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          {/* Grid */}
          <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
          <polygon points="50,20 80,37 80,63 50,80 20,63 20,37" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
          <polygon points="50,35 65,43 65,57 50,65 35,57 35,43" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
          {/* Axes */}
          {[5, 27.5, 72.5, 95, 72.5, 27.5].map((_, i) => {
            const angles = [0, 60, 120, 180, 240, 300]
            const rad = (angles[i] - 90) * (Math.PI / 180)
            const x2 = 50 + 45 * Math.cos(rad)
            const y2 = 50 + 45 * Math.sin(rad)
            return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.3" className="text-outline-variant opacity-20" />
          })}
          {/* Data polygon */}
          {card.radarAxes.length === 6 && (() => {
            const points = card.radarAxes.map((a, i) => {
              const angle = (i * 60 - 90) * (Math.PI / 180)
              const r = (a.score / 100) * 45
              return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`
            }).join(" ")
            return <polygon points={points} fill="rgba(203, 190, 255, 0.4)" stroke="#cbbeff" strokeWidth="2" className="radar-data-polygon" />
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
    <div className="flex justify-between items-start mb-2">
      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-label)] text-[10px] text-tertiary-fixed uppercase tracking-widest mb-1">Archetype</span>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary">{card.archetype}</h3>
      </div>
    </div>
    <div className="dotted-line my-4" />
    <p className="font-[family-name:var(--font-body)] text-on-surface leading-relaxed italic mb-4">
      &ldquo;{card.blurb}&rdquo;
    </p>
    {card.audioUrl && (
      <button
        onClick={() => {
          const audio = new Audio(card.audioUrl!)
          audio.play()
        }}
        className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-3 rounded-lg w-full justify-center border border-primary/20 hover:bg-surface-container-highest transition-colors active:scale-95"
      >
        <span className="material-symbols-outlined">campaign</span>
        <span className="font-[family-name:var(--font-body)] font-bold">Play Voice Profile</span>
      </button>
    )}
  </section>

  {/* Your Favorites */}
  <section className="bg-surface-container p-6 rounded-xl border border-dotted border-outline-variant relative overflow-hidden">
    <h4 className="font-[family-name:var(--font-display)] text-lg font-semibold text-primary mb-4">Your Favorites</h4>
    <div className="space-y-3">
      {(["games", "anime", "artists"] as Category[]).map((cat) => {
        const items = card[cat]
        const config = CATEGORY_CONFIG[cat]
        return items.length > 0 && (
          <div key={cat} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/10">
            <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span key={item} className="bg-surface-container-highest text-on-surface px-2 py-0.5 rounded text-xs">{item}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
    <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
      <span className="material-symbols-outlined text-[120px]">hub</span>
    </div>
  </section>

  {/* Regenerate */}
  <button
    onClick={() => { setCard(null) }}
    className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl hover:bg-surface-container transition-colors"
  >
    Regenerate
  </button>
</div>
```

- [ ] **Step 2: Add radar animation CSS to `app/globals.css`**

Append:

```css
.radar-data-polygon {
  animation: radar-reveal 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes radar-reveal {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add app/passion-card/ app/globals.css && git commit -m "feat(ui): add passion radar result view with SVG chart"
```

---

### Task 10: PNG Export — Install `html-to-image`

- [ ] **Step 1: Install dependency**

```bash
npm install html-to-image
```

- [ ] **Step 2: Add Download button to result view**

In `app/passion-card/page.tsx`, add a ref for the radar section and a download handler. Add `useRef` to the imports, then:

```tsx
import { toPng } from "html-to-image"
```

Inside the component, add:

```tsx
const radarRef = useRef<HTMLDivElement>(null)

async function handleDownload() {
  if (!radarRef.current) return
  const dataUrl = await toPng(radarRef.current, { backgroundColor: "#141314" })
  const link = document.createElement("a")
  link.download = "passion-radar.png"
  link.href = dataUrl
  link.click()
}
```

Wrap the radar chart section with `ref={radarRef}` and add a download button below the regenerate button:

```tsx
<button
  onClick={handleDownload}
  className="w-full flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container py-3 rounded-xl hover:bg-secondary-container/80 transition-colors"
>
  <span className="material-symbols-outlined">download</span>
  Download Card
</button>
```

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(ui): add PNG export with html-to-image"
```

---

### Task 11: Update Bottom Nav on All Pages

- [ ] **Step 1: Update `app/devotion-log/page.tsx` bottom nav**

In the bottom nav, change the Radar tab from the current 4th tab (Recap) structure. Add a 4th tab for Radar. The existing nav has Journal | Timeline | Recap. Add Radar as 4th tab:

Replace the bottom nav `<nav>` section with:

```tsx
<nav className="fixed bottom-0 w-full z-50 bg-surface-container/90 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.4)] rounded-t-xl flex justify-around items-center px-4 pb-6 pt-3">
  <div className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1">
    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
    <span className="font-[family-name:var(--font-label)] text-xs">Journal</span>
  </div>
  <Link href="/devotion-log/timeline" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
    <span className="material-symbols-outlined">auto_stories</span>
    <span className="font-[family-name:var(--font-label)] text-xs">Timeline</span>
  </Link>
  <Link href="/devotion-log/recap" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
    <span className="material-symbols-outlined">graphic_eq</span>
    <span className="font-[family-name:var(--font-label)] text-xs">Recap</span>
  </Link>
  <Link href="/passion-card" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
    <span className="material-symbols-outlined">insights</span>
    <span className="font-[family-name:var(--font-label)] text-xs">Radar</span>
  </Link>
</nav>
```

- [ ] **Step 2: Update `app/devotion-log/timeline/page.tsx` bottom nav**

Same pattern — add Radar tab as 4th item, using `<Link href="/passion-card">`.

- [ ] **Step 3: Update `app/devotion-log/recap/page.tsx` bottom nav**

Same pattern — add Radar tab as 4th item, using `<Link href="/passion-card">`.

- [ ] **Step 4: Verify build passes**

```bash
npx next build 2>&1 | tail -15
```

Expected: All pages compile, all routes listed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(nav): add Radar tab to all bottom navigation bars"
```

---

### Task 12: Final Integration Test

- [ ] **Step 1: Start dev server**

```bash
npx next dev -p 3001 -H 0.0.0.0
```

- [ ] **Step 2: Navigate to `/passion-card`**

Verify: Input form renders with 3 tag input sections.

- [ ] **Step 3: Enter favorites and generate**

Enter at least 1 game, 1 anime, 1 artist. Click "Generate My Radar."

Verify: Loading spinner appears, then result view with radar chart, archetype, blurb, voice play button, favorites display.

- [ ] **Step 4: Test voice playback**

Click "Play Voice Profile."

Verify: Audio plays (requires ElevenLabs API key in .env).

- [ ] **Step 5: Test PNG download**

Click "Download Card."

Verify: PNG file downloads with dark background.

- [ ] **Step 6: Test navigation**

Click Radar tab on journal/timeline/recap pages.

Verify: All navigate to `/passion-card`.

- [ ] **Step 7: Test URL sharing**

Copy URL from browser, open in new tab.

Verify: Card loads from GET `/api/passion-card/[id]`.

- [ ] **Step 8: Run lint**

```bash
npm run lint
```

Expected: 0 errors, only pre-existing warnings.

- [ ] **Step 9: Kill dev server**

```bash
kill $(pgrep -f "next dev")
```
