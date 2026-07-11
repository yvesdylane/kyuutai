# Passion Radar — Design Spec

## Overview

The Passion Radar is a taste-fusion profile generator. Users manually enter their top favorites (games, anime, artists), and the AI synthesizes an emotional through-line — producing a hexagonal radar chart, an archetype name, a personality blurb, and a narrated voice profile. The result is a shareable card (PNG download + URL).

## Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Data input | Manual text input | MVP simplicity, no OAuth/API complexity |
| Radar axes | AI-determined (not fixed) | More personal, each user gets unique dimensions |
| Generation flow | Single-shot | One API call, one loading state, simpler code |
| Shareable export | PNG download + URL | Both wanted |
| Voice caching | Cache audio in DB | Avoid regenerating on every play |
| Current Obsession | Auto-picked from journal | Leverages existing data, no extra input |

## Data Model

### DB Table: `passion_cards`

```sql
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
```

### TypeScript Types (`types/passion-card.ts`)

```ts
interface RadarAxis {
  axis: string
  score: number  // 0-100
}

interface PassionCard {
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

interface GeneratePassionCardRequest {
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
}
```

## API Routes

### `POST /api/passion-card`

**Input:**
```json
{
  "userId": "user1",
  "games": ["Elden Ring", "Celeste", "Hollow Knight"],
  "anime": ["Mushishi", "March Comes in Like a Lion"],
  "artists": ["Explosions in the Sky", "Boards of Canada"]
}
```

**Flow:**
1. Validate: at least 1 item per category, userId present
2. Call Gemini with structured prompt → returns `{axes, archetype, blurb}`
3. Query `journal_entries` for most recent entry → set as `obsession_id`
4. Call ElevenLabs to narrate `blurb` → save MP3 to `public/audio/`
5. Insert into `passion_cards` table
6. Return full `PassionCard`

**Output:**
```json
{
  "data": {
    "id": "...",
    "radarAxes": [
      {"axis": "Melancholy", "score": 85},
      {"axis": "Atmosphere", "score": 92},
      {"axis": "Narrative Depth", "score": 78},
      {"axis": "Nostalgia", "score": 65},
      {"axis": "Challenge", "score": 45},
      {"axis": "Introspection", "score": 88}
    ],
    "archetype": "The Melancholic Voyager",
    "blurb": "You gravitate toward slow-burn...",
    "audioUrl": "/audio/passion-123456.mp3",
    "obsessionId": "...",
    ...
  }
}
```

### `GET /api/passion-card?userId=user1`

Returns the latest passion card for the user, or `{data: null}`.

### `GET /api/passion-card/[id]`

Returns a specific card by ID (for URL-based sharing).

## File Structure

```
app/
  passion-card/
    page.tsx                          # Main page (client component)
  api/
    passion-card/
      route.ts                        # GET (latest) + POST (generate)
      [id]/
        route.ts                      # GET by ID (sharing)
      passion-card.service.ts         # Gemini + ElevenLabs orchestration
      passion-card.repository.ts      # Raw SQL queries + mapRow

types/
  passion-card.ts                     # RadarAxis, PassionCard, GeneratePassionCardRequest

lib/
  gemini.ts                           # Existing — reuse generateRecapScript pattern
  elevenlabs.ts                       # Existing — reuse textToSpeech
```

## UI Design

Based on Stitch reference: `docs/stitch/passion-radar/passion-radar-profile.html`

### State 1: No Card (Input Form)

- **Header:** Back arrow + "Passion Card" title
- **Input sections:** 3 labeled groups (Games, Anime, Artists)
  - Each: label + tag input field
  - Type text, press Enter → chip appears with X remove button
  - Placeholder: "e.g. Elden Ring, Celeste, Hades..."
- **Generate button:** "Generate My Radar" — primary style, disabled until all 3 categories have ≥1 item
- **Loading state:** Spinner + "Analyzing your taste universe..."

### State 2: Card Generated (Result View)

Four sections matching Stitch design:

1. **Radar Chart** — SVG hexagon
   - 3 concentric grid hexagons (opacity 30%)
   - 6 axis lines from center
   - Data polygon with secondary color fill + stroke
   - Labels positioned around the hexagon
   - Load animation: scale 0.8→1, opacity 0→1, 1.2s spring ease

2. **Personality Blurb Card**
   - "ARCHETYPE" label in tertiary-fixed color, uppercase, tracking-widest
   - Archetype name in headline-md
   - Edit button (secondary bg, movie_edit icon) — placeholder for future "regenerate" or "customize"
   - Notebook divider (dotted line)
   - Italic blurb text in quotes
   - "Play Voice Profile" button (primary-container bg, campaign icon)

3. **Taste Fusion** (repurposed as "Your Favorites")
   - Dotted border section
   - Shows entered games/anime/artists as chips grouped by category
   - Each category has colored icon (sports_esports, movie, music_note)
   - Floating hub icon decorative element

4. **Current Obsession**
   - Scrapbook-style card with hero image (from journal entry or generated placeholder)
   - "Pinned" badge
   - Title + description from journal entry
   - Torn edge effect at bottom

### Bottom Navigation

4 tabs: Journal | Timeline | Recap | **Radar** (active)

Active state: `bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1`

### Actions

- **Regenerate** — ghost button, calls POST again
- **Download Card** — triggers `html-to-image` PNG export of radar section
- **Share** — copies page URL to clipboard

## Gemini Prompt

```
Analyze these favorites and produce a passion profile.

Games: {games}
Anime: {anime}
Artists: {artists}

Return ONLY valid JSON:
{
  "axes": [
    {"axis": "emotion name", "score": 0-100},
    ...exactly 6 axes
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
```

## ElevenLabs Integration

Reuse existing `textToSpeech()` from `lib/elevenlabs.ts`:
- Voice: Adam (`pNInz6obpgDQGcFmaJgB`)
- Model: `eleven_multilingual_v2`
- Settings: stability 0.35, similarity 0.85, style 0.1
- Output: saved to `public/audio/passion-{timestamp}.mp3`

## PNG Export

- Dependency: `html-to-image` (~2KB, pure ES modules)
- Target: ref the radar chart section DOM node
- Config: `{ backgroundColor: '#141314' }` to match dark theme
- Output: `passion-radar.png` download via blob URL

## Error Handling

- Empty categories → 400 "Please add at least one item to each category"
- Gemini failure → 500 with descriptive error
- ElevenLabs failure → card still saved without audio (audioUrl = null)
- No journal entries for obsession → obsessionId = null, UI shows "No recent entries"

## Existing Code Reuse

- `lib/db.ts` — pg Pool (no changes)
- `lib/gemini.ts` — add `generatePassionProfile()` function
- `lib/elevenlabs.ts` — reuse `textToSpeech()` directly
- `types/passion-card.ts` — replace placeholder types with new ones
- Stitch design HTML — reference for pixel-perfect recreation
