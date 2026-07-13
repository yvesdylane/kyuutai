# OST Detective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quiz game where players guess the source of short audio clips from game/anime OSTs, with AI-generated questions and narrator reactions, pre-generated for zero-delay between rounds.

**Architecture:** Route → Service → Repository pattern (matching existing codebase). Gemini generates questions/reactions, ElevenLabs synthesizes narrator audio. Next-round pre-generation in background via fire-and-forget after each answer.

**Tech Stack:** Next.js 16 App Router, PostgreSQL (raw SQL via `pg`), Google Gemini (`@google/generative-ai`), ElevenLabs (`elevenlabs`), Auth.js v5, Tailwind CSS

---

## File Structure

```
app/
├── api/ost-detective/
│   ├── session/
│   │   └── start/route.ts              # POST: create session + generate round 1
│   └── round/
│       ├── [roundId]/
│       │   └── answer/route.ts         # POST: submit answer + trigger next round
│       └── next/
│           └── route.ts                # GET: fetch next ready round
│   └── session/
│       └── [sessionId]/
│           └── summary/route.ts        # GET: post-game recap
│   └── leaderboard/route.ts            # GET: top sessions
├── ost-detective/
│   └── page.tsx                        # Game screen (client component)
├── ost-detective/
│   ├── game-session.repository.ts
│   ├── game-round.service.ts
│   ├── narrator.service.ts
│   ├── gemini-client.ts
│   └── elevenlabs-client.ts
├── ost-detective/
│   ├── track.repository.ts
├── ost-detective/
│   ├── track.seed.ts                   # Seed data script
├── db/
│   └── migrations/
│       └── 001_add_ost_tables.sql
├── types/
│   └── ostDetective.ts                 # Updated types
├── public/audio/                       # Generated narrator audio stored here
```

---

## Task 1: Database Migration

**Files:**
- Create: `db/migrations/001_add_ost_tables.sql`

- [ ] **Step 1: Create migration file**

```sql
-- OST Detective: Add track and game_round tables, modify game_session

-- Track library
CREATE TABLE track (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title        TEXT NOT NULL,
    source_name  TEXT NOT NULL,
    source_type  media_type NOT NULL,
    clip_url     TEXT NOT NULL,
    duration_sec INT NOT NULL,
    mood_tags    JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_track_mood_tags ON track USING GIN (mood_tags);

-- Game rounds
CREATE TABLE game_round (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id          TEXT NOT NULL REFERENCES game_session(id) ON DELETE CASCADE,
    track_id            TEXT NOT NULL REFERENCES track(id),
    question_text       TEXT,
    options             JSONB NOT NULL DEFAULT '[]'::JSONB,
    correct_id          TEXT NOT NULL,
    user_answer_id      TEXT,
    is_correct          BOOLEAN,
    narrator_line       TEXT,
    narrator_audio_url  TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',
    round_index         INT NOT NULL,
    answered_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_round_session ON game_round (session_id, round_index);

-- Remove clips_played from game_session (superseded by game_round)
ALTER TABLE game_session DROP COLUMN clips_played;
```

- [ ] **Step 2: Run migration against database**

```bash
PGPASSWORD='pwd$4$Postgres' psql -h localhost -U postgres -d postgres -f db/migrations/001_add_ost_tables.sql
```

Expected: Tables created, index created, column dropped.

- [ ] **Step 3: Update schema.sql**

Add the `track` and `game_round` tables to `db/schema.sql` and remove `clips_played` from `game_session`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/001_add_ost_tables.sql db/schema.sql
git commit -m "db: add track and game_round tables for OST Detective"
```

---

## Task 2: Seed Data Script

**Files:**
- Create: `scripts/seed-tracks.ts`

- [ ] **Step 1: Create seed script with track data**

```typescript
import pg from "pg"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const MOOD_VOCABULARY = [
  "melancholic", "triumphant", "tense", "whimsical", "sparse",
  "epic", "nostalgic", "driving", "eerie", "romantic",
  "upbeat", "mysterious", "serene", "aggressive", "dreamy",
]

const tracks = [
  { title: "Title Screen", sourceName: "Pixel Quest", sourceType: "GAME", clipUrl: "/audio/tracks/pixel-quest-title.mp3", durationSec: 30, moodTags: ["upbeat", "nostalgic", "whimsical"] },
  { title: "Battle Theme", sourceName: "Pixel Quest", sourceType: "GAME", clipUrl: "/audio/tracks/pixel-quest-battle.mp3", durationSec: 30, moodTags: ["driving", "tense", "epic"] },
  { title: "Forest Walk", sourceName: "Pixel Quest", sourceType: "GAME", clipUrl: "/audio/tracks/pixel-quest-forest.mp3", durationSec: 30, moodTags: ["serene", "mysterious", "whimsical"] },
  { title: "Boss Encounter", sourceName: "Neon Blade", sourceType: "GAME", clipUrl: "/audio/tracks/neon-blade-boss.mp3", durationSec: 30, moodTags: ["aggressive", "epic", "tense"] },
  { title: "City Rooftops", sourceName: "Neon Blade", sourceType: "GAME", clipUrl: "/audio/tracks/neon-blade-city.mp3", durationSec: 30, moodTags: ["driving", "upbeat", "mysterious"] },
  { title: "Character Select", sourceName: "Neon Blade", sourceType: "GAME", clipUrl: "/audio/tracks/neon-blade-select.mp3", durationSec: 30, moodTags: ["upbeat", "triumphant", "driving"] },
  { title: "Opening Theme", sourceName: "Stellar Academy", sourceType: "ANIME", clipUrl: "/audio/tracks/stellar-opening.mp3", durationSec: 30, moodTags: ["triumphant", "upbeat", "romantic"] },
  { title: "Emotionalgoodbye", sourceName: "Stellar Academy", sourceType: "ANIME", clipUrl: "/audio/tracks/stellar-goodbye.mp3", durationSec: 30, moodTags: ["melancholic", "romantic", "serene"] },
  { title: "Training Montage", sourceName: "Stellar Academy", sourceType: "ANIME", clipUrl: "/audio/tracks/stellar-training.mp3", durationSec: 30, moodTags: ["driving", "triumphant", "epic"] },
  { title: "Mystery Room", sourceName: "Shadow Realm", sourceType: "GAME", clipUrl: "/audio/tracks/shadow-mystery.mp3", durationSec: 30, moodTags: ["eerie", "mysterious", "sparse"] },
  { title: "Final Dungeon", sourceName: "Shadow Realm", sourceType: "GAME", clipUrl: "/audio/tracks/shadow-dungeon.mp3", durationSec: 30, moodTags: ["tense", "eerie", "epic"] },
  { title: "Victory Fanfare", sourceName: "Shadow Realm", sourceType: "GAME", clipUrl: "/audio/tracks/shadow-victory.mp3", durationSec: 30, moodTags: ["triumphant", "upbeat", "epic"] },
  { title: "Beach Episode", sourceName: "Summer Days", sourceType: "ANIME", clipUrl: "/audio/tracks/summer-beach.mp3", durationSec: 30, moodTags: ["serene", "dreamy", "romantic"] },
  { title: "Festival Night", sourceName: "Summer Days", sourceType: "ANIME", clipUrl: "/audio/tracks/summer-festival.mp3", durationSec: 30, moodTags: ["whimsical", "upbeat", "nostalgic"] },
  { title: "Chase Scene", sourceName: "Cyber Drift", sourceType: "GAME", clipUrl: "/audio/tracks/cyber-chase.mp3", durationSec: 30, moodTags: ["driving", "aggressive", "tense"] },
  { title: "Menu Select", sourceName: "Cyber Drift", sourceType: "GAME", clipUrl: "/audio/tracks/cyber-menu.mp3", durationSec: 30, moodTags: ["mysterious", "sparse", "dreamy"] },
  { title: "Race Start", sourceName: "Cyber Drift", sourceType: "GAME", clipUrl: "/audio/tracks/cyber-race.mp3", durationSec: 30, moodTags: ["driving", "epic", "triumphant"] },
  { title: "Love Confession", sourceName: "Moonlit Path", sourceType: "ANIME", clipUrl: "/audio/tracks/moonlit-confession.mp3", durationSec: 30, moodTags: ["romantic", "melancholic", "serene"] },
  { title: "School Hallway", sourceName: "Moonlit Path", sourceType: "ANIME", clipUrl: "/audio/tracks/moonlit-school.mp3", durationSec: 30, moodTags: ["nostalgic", "serene", "whimsical"] },
  { title: "Dark Ritual", sourceName: "Abyss Gate", sourceType: "GAME", clipUrl: "/audio/tracks/abyss-ritual.mp3", durationSec: 30, moodTags: ["eerie", "tense", "mysterious"] },
  { title: "Sky Temple", sourceName: "Abyss Gate", sourceType: "GAME", clipUrl: "/audio/tracks/abyss-temple.mp3", durationSec: 30, moodTags: ["epic", "serene", "dreamy"] },
  { title: "Combat Training", sourceName: "Iron Vanguard", sourceType: "GAME", clipUrl: "/audio/tracks/iron-training.mp3", durationSec: 30, moodTags: ["driving", "aggressive", "triumphant"] },
  { title: "War Council", sourceName: "Iron Vanguard", sourceType: "GAME", clipUrl: "/audio/tracks/iron-council.mp3", durationSec: 30, moodTags: ["tense", "mysterious", "epic"] },
  { title: "Opening", sourceName: "Crimson Arc", sourceType: "ANIME", clipUrl: "/audio/tracks/crimson-opening.mp3", durationSec: 30, moodTags: ["aggressive", "epic", "triumphant"] },
  { title: "Flashback", sourceName: "Crimson Arc", sourceType: "ANIME", clipUrl: "/audio/tracks/crimson-flashback.mp3", durationSec: 30, moodTags: ["melancholic", "nostalgic", "dreamy"] },
  { title: "Stealth Mission", sourceName: "Ghost Protocol", sourceType: "GAME", clipUrl: "/audio/tracks/ghost-stealth.mp3", durationSec: 30, moodTags: ["tense", "sparse", "mysterious"] },
  { title: "Escape Sequence", sourceName: "Ghost Protocol", sourceType: "GAME", clipUrl: "/audio/tracks/ghost-escape.mp3", durationSec: 30, moodTags: ["driving", "tense", "aggressive"] },
  { title: "Mountain Peak", sourceName: "Dragon Spine", sourceType: "GAME", clipUrl: "/audio/tracks/dragon-peak.mp3", durationSec: 30, moodTags: ["epic", "serene", "nostalgic"] },
  { title: "Dragon Battle", sourceName: "Dragon Spine", sourceType: "GAME", clipUrl: "/audio/tracks/dragon-battle.mp3", durationSec: 30, moodTags: ["epic", "aggressive", "driving"] },
  { title: "Quiet Village", sourceName: "Dragon Spine", sourceType: "GAME", clipUrl: "/audio/tracks/dragon-village.mp3", durationSec: 30, moodTags: ["serene", "nostalgic", "whimsical"] },
]

async function seed() {
  console.log("Seeding tracks...")
  for (const track of tracks) {
    await pool.query(
      `INSERT INTO track (title, source_name, source_type, clip_url, duration_sec, mood_tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [track.title, track.sourceName, track.sourceType, track.clipUrl, track.durationSec, JSON.stringify(track.moodTags)]
    )
  }
  console.log(`Seeded ${tracks.length} tracks`)
  await pool.end()
}

seed().catch(console.error)
```

- [ ] **Step 2: Run seed script**

```bash
npx tsx scripts/seed-tracks.ts
```

Expected: "Seeded 30 tracks"

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-tracks.ts
git commit -m "feat: add track seed data for OST Detective"
```

---

## Task 3: Types

**Files:**
- Create: `types/ostDetective.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: Create OST Detective types**

```typescript
export interface track {
  id: string
  title: string
  sourceName: string
  sourceType: "GAME" | "ANIME" | "SONG"
  clipUrl: string
  durationSec: number
  moodTags: string[]
  createdAt: string
}

export interface gameRound {
  id: string
  sessionId: string
  trackId: string
  questionText: string | null
  options: { id: string; title: string; sourceName: string }[]
  correctId: string
  userAnswerId: string | null
  isCorrect: boolean | null
  narratorLine: string | null
  narratorAudioUrl: string | null
  status: "pending" | "ready" | "answered"
  roundIndex: number
  answeredAt: string | null
  createdAt: string
}

export interface gameSession {
  id: string
  userId: string
  score: number
  streak: number
  mode: string
  createdAt: string
}

export interface startSessionResponse {
  sessionId: string
  round: gameRound
}

export interface answerRoundResponse {
  isCorrect: boolean
  narratorLine: string
  narratorAudioUrl: string
  updatedStreak: number
  updatedScore: number
}
```

- [ ] **Step 2: Update types/index.ts to re-export**

Add to `types/index.ts`:
```typescript
export type { track, gameRound, gameSession, startSessionResponse, answerRoundResponse } from "./ostDetective"
```

- [ ] **Step 3: Commit**

```bash
git add types/ostDetective.ts types/index.ts
git commit -m "feat: add OST Detective types"
```

---

## Task 4: Track Repository

**Files:**
- Create: `app/api/ost-detective/track.repository.ts`

- [ ] **Step 1: Create track repository**

```typescript
import pool from "@/lib/db"
import type { track } from "@/types/ostDetective"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): track {
  return {
    id: row.id,
    title: row.title,
    sourceName: row.source_name,
    sourceType: row.source_type,
    clipUrl: row.clip_url,
    durationSec: row.duration_sec,
    moodTags: row.mood_tags,
    createdAt: row.created_at,
  }
}

export async function getRandomUnplayedTrack(sessionId: string): Promise<track | null> {
  const result = await pool.query(
    `SELECT t.* FROM track t
     WHERE t.id NOT IN (
       SELECT gr.track_id FROM game_round gr WHERE gr.session_id = $1
     )
     ORDER BY RANDOM()
     LIMIT 1`,
    [sessionId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getMoodDistractors(
  trackId: string,
  excludeIds: string[],
  count: number = 3
): Promise<track[]> {
  const result = await pool.query(
    `SELECT t.* FROM track t
     WHERE t.id != $1
       AND t.id != ALL($2)
       AND t.mood_tags ?| (
         SELECT ARRAY(
           SELECT jsonb_array_elements_text(mood_tags) FROM track WHERE id = $1
         )
       )
     ORDER BY RANDOM()
     LIMIT $3`,
    [trackId, excludeIds, count]
  )
  return result.rows.map(mapRow)
}

export async function getTrackById(id: string): Promise<track | null> {
  const result = await pool.query("SELECT * FROM track WHERE id = $1", [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/track.repository.ts
git commit -m "feat: add track repository for OST Detective"
```

---

## Task 5: Gemini Client

**Files:**
- Create: `app/api/ost-detective/gemini-client.ts`

- [ ] **Step 1: Create Gemini client**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

const SYSTEM_PROMPT = `You are the narrator of "OST Detective," a fast-paced trivia game about game and anime soundtracks. Your persona is an energetic, slightly theatrical game-show host who is knowledgeable about music mood and emotional tone. Keep all responses short, punchy, and suited for text-to-speech playback (avoid emojis, avoid markdown, avoid stage directions).`

export async function generateQuestion(
  correctTrack: { title: string; sourceName: string; moodTags: string[] },
  distractors: { title: string; sourceName: string; moodTags: string[] }[]
): Promise<string> {
  const prompt = `Correct track: "${correctTrack.title}" from ${correctTrack.sourceName} (mood: ${correctTrack.moodTags.join(", ")})
Distractors: ${distractors.map(d => `"${d.title}" from ${d.sourceName} (mood: ${d.moodTags.join(", ")})`).join("; ")}
Task: Write ONE short quiz question stem (max 15 words) asking the player to identify the source of a music clip they just heard. Vary phrasing across calls — do not always say "which game is this from." Return plain text only, no preamble.`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: 100, temperature: 0.4 },
  })
  return result.response.text().trim()
}

export async function generateNarratorReaction(
  isCorrect: boolean,
  correctTrack: { title: string; sourceName: string; moodTags: string[] },
  guessedTrack: { title: string; sourceName: string; moodTags: string[] }
): Promise<string> {
  const sharedMoods = correctTrack.moodTags.filter(t => guessedTrack.moodTags.includes(t))
  const prompt = `Answer: ${isCorrect ? "CORRECT" : "INCORRECT"}
Correct track: "${correctTrack.title}" from ${correctTrack.sourceName} (mood: ${correctTrack.moodTags.join(", ")})
Guessed track: "${guessedTrack.title}" from ${guessedTrack.sourceName} (mood: ${guessedTrack.moodTags.join(", ")})
Shared mood qualities: ${sharedMoods.join(", ") || "none"}
Task: Write ONE short in-character reaction (max 30 words). If correct, celebrate with specific reference to the track's mood. If incorrect, explain briefly why the guessed track felt like a plausible trap by naming the shared mood quality, without being unkind. Return plain text only, no preamble.`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: 150, temperature: 0.8 },
  })
  return result.response.text().trim()
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/gemini-client.ts
git commit -m "feat: add Gemini client for OST Detective questions and reactions"
```

---

## Task 6: ElevenLabs Client

**Files:**
- Create: `app/api/ost-detective/elevenlabs-client.ts`

- [ ] **Step 1: Create ElevenLabs client**

```typescript
import { ElevenLabs } from "elevenlabs"
import { writeFile } from "fs/promises"
import path from "path"

const client = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export async function textToSpeech(text: string): Promise<string> {
  const audio = await client.textToSpeech.convert({
    voice_id: "pNInz6obpgDQGcFmaJgB",
    text,
    model_id: "eleven_multilingual_v2",
  })

  const filename = `narrator-${Date.now()}.mp3`
  const filepath = path.join(process.cwd(), "public", "audio", filename)

  const chunks: Buffer[] = []
  for await (const chunk of audio) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  await writeFile(filepath, Buffer.concat(chunks))

  return `/audio/${filename}`
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/elevenlabs-client.ts
git commit -m "feat: add ElevenLabs TTS client for OST Detective narrator"
```

---

## Task 7: Game Session Repository

**Files:**
- Create: `app/api/ost-detective/game-session.repository.ts`

- [ ] **Step 1: Create game session repository**

```typescript
import pool from "@/lib/db"
import type { gameSession } from "@/types/ostDetective"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): gameSession {
  return {
    id: row.id,
    userId: row.user_id,
    score: row.score,
    streak: row.streak,
    mode: row.mode,
    createdAt: row.created_at,
  }
}

export async function createSession(userId: string, mode: string): Promise<gameSession> {
  const result = await pool.query(
    'INSERT INTO game_session (user_id, mode) VALUES ($1, $2) RETURNING *',
    [userId, mode]
  )
  return mapRow(result.rows[0])
}

export async function getSessionById(id: string): Promise<gameSession | null> {
  const result = await pool.query("SELECT * FROM game_session WHERE id = $1", [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function updateSessionScore(
  id: string,
  score: number,
  streak: number
): Promise<void> {
  await pool.query(
    "UPDATE game_session SET score = $1, streak = $2 WHERE id = $3",
    [score, streak, id]
  )
}

export async function getLeaderboard(limit: number = 10): Promise<gameSession[]> {
  const result = await pool.query(
    "SELECT * FROM game_session ORDER BY score DESC, streak DESC LIMIT $1",
    [limit]
  )
  return result.rows.map(mapRow)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/game-session.repository.ts
git commit -m "feat: add game session repository for OST Detective"
```

---

## Task 8: Game Round Service

**Files:**
- Create: `app/api/ost-detective/game-round.service.ts`

- [ ] **Step 1: Create game round service**

```typescript
import pool from "@/lib/db"
import { getRandomUnplayedTrack, getMoodDistractors, getTrackById } from "./track.repository"
import { generateQuestion } from "./gemini-client"
import type { gameRound } from "@/types/ostDetective"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): gameRound {
  return {
    id: row.id,
    sessionId: row.session_id,
    trackId: row.track_id,
    questionText: row.question_text,
    options: row.options,
    correctId: row.correct_id,
    userAnswerId: row.user_answer_id,
    isCorrect: row.is_correct,
    narratorLine: row.narrator_line,
    narratorAudioUrl: row.narrator_audio_url,
    status: row.status,
    roundIndex: row.round_index,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
  }
}

export async function generateRound(sessionId: string): Promise<gameRound> {
  const track = await getRandomUnplayedTrack(sessionId)
  if (!track) throw new Error("No more tracks available")

  const excludeIds = [track.id]
  const distractors = await getMoodDistractors(track.id, excludeIds, 3)

  const options = [
    { id: track.id, title: track.title, sourceName: track.sourceName },
    ...distractors.map(d => ({ id: d.id, title: d.title, sourceName: d.sourceName })),
  ].sort(() => Math.random() - 0.5)

  const questionText = await generateQuestion(
    { title: track.title, sourceName: track.sourceName, moodTags: track.moodTags },
    distractors.map(d => ({ title: d.title, sourceName: d.sourceName, moodTags: d.moodTags }))
  )

  const roundIndex = await getNextRoundIndex(sessionId)

  const result = await pool.query(
    `INSERT INTO game_round (session_id, track_id, question_text, options, correct_id, status, round_index)
     VALUES ($1, $2, $3, $4, $5, 'ready', $6)
     RETURNING *`,
    [sessionId, track.id, questionText, JSON.stringify(options), track.id, roundIndex]
  )

  return mapRow(result.rows[0])
}

export async function getRoundById(id: string): Promise<gameRound | null> {
  const result = await pool.query("SELECT * FROM game_round WHERE id = $1", [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getNextReadyRound(sessionId: string): Promise<gameRound | null> {
  const result = await pool.query(
    "SELECT * FROM game_round WHERE session_id = $1 AND status = 'ready' ORDER BY round_index ASC LIMIT 1",
    [sessionId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getSessionRounds(sessionId: string): Promise<gameRound[]> {
  const result = await pool.query(
    "SELECT * FROM game_round WHERE session_id = $1 ORDER BY round_index ASC",
    [sessionId]
  )
  return result.rows.map(mapRow)
}

async function getNextRoundIndex(sessionId: string): Promise<number> {
  const result = await pool.query(
    "SELECT COALESCE(MAX(round_index), 0) + 1 AS next_index FROM game_round WHERE session_id = $1",
    [sessionId]
  )
  return result.rows[0].next_index
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/game-round.service.ts
git commit -m "feat: add game round service for OST Detective"
```

---

## Task 9: Narrator Service

**Files:**
- Create: `app/api/ost-detective/narrator.service.ts`

- [ ] **Step 1: Create narrator service**

```typescript
import pool from "@/lib/db"
import { getTrackById } from "./track.repository"
import { getRoundById } from "./game-round.service"
import { generateNarratorReaction } from "./gemini-client"
import { textToSpeech } from "./elevenlabs-client"
import { updateSessionScore, getSessionById } from "./game-session.repository"

export async function answerRound(
  roundId: string,
  userAnswerId: string
): Promise<{
  isCorrect: boolean
  narratorLine: string
  narratorAudioUrl: string
  updatedStreak: number
  updatedScore: number
}> {
  const round = await getRoundById(roundId)
  if (!round) throw new Error("Round not found")
  if (round.status !== "ready") throw new Error("Round already answered")

  const isCorrect = round.correctId === userAnswerId
  const correctTrack = await getTrackById(round.correctId)
  const guessedTrack = await getTrackById(userAnswerId)
  if (!correctTrack || !guessedTrack) throw new Error("Track not found")

  const narratorLine = await generateNarratorReaction(
    isCorrect,
    { title: correctTrack.title, sourceName: correctTrack.sourceName, moodTags: correctTrack.moodTags },
    { title: guessedTrack.title, sourceName: guessedTrack.sourceName, moodTags: guessedTrack.moodTags }
  )

  const narratorAudioUrl = await textToSpeech(narratorLine)

  await pool.query(
    `UPDATE game_round
     SET user_answer_id = $1, is_correct = $2, narrator_line = $3, narrator_audio_url = $4, status = 'answered', answered_at = NOW()
     WHERE id = $5`,
    [userAnswerId, isCorrect, narratorLine, narratorAudioUrl, roundId]
  )

  const session = await getSessionById(round.sessionId)
  if (!session) throw new Error("Session not found")

  const updatedStreak = isCorrect ? session.streak + 1 : 0
  const updatedScore = session.score + (isCorrect ? 100 * updatedStreak : 0)
  await updateSessionScore(round.sessionId, updatedScore, updatedStreak)

  return { isCorrect, narratorLine, narratorAudioUrl, updatedStreak, updatedScore }
}

export async function preGenerateNextRound(sessionId: string): Promise<void> {
  try {
    const { generateRound } = await import("./game-round.service")
    await generateRound(sessionId)
  } catch (error) {
    console.error("Pre-generation failed:", error)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ost-detective/narrator.service.ts
git commit -m "feat: add narrator service for OST Detective"
```

---

## Task 10: API Routes

**Files:**
- Create: `app/api/ost-detective/session/start/route.ts`
- Create: `app/api/ost-detective/round/[roundId]/answer/route.ts`
- Create: `app/api/ost-detective/round/next/route.ts`
- Create: `app/api/ost-detective/session/[sessionId]/summary/route.ts`
- Create: `app/api/ost-detective/leaderboard/route.ts`

- [ ] **Step 1: Create session start route**

```typescript
// app/api/ost-detective/session/start/route.ts
import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { createSession } from "../../game-session.repository"
import { generateRound } from "../../game-round.service"

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const { mode } = await request.json()

    if (!mode) {
      return Response.json({ error: "Mode is required" }, { status: 400 })
    }

    const session = await createSession(userId, mode)
    const round = await generateRound(session.id)

    return Response.json({ data: { sessionId: session.id, round } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
```

- [ ] **Step 2: Create answer round route**

```typescript
// app/api/ost-detective/round/[roundId]/answer/route.ts
import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getRoundById } from "../../../game-round.service"
import { answerRound, preGenerateNextRound } from "../../../narrator.service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const userId = await getAuthUserId()
    const { roundId } = await params
    const { user_answer_id } = await request.json()

    if (!user_answer_id) {
      return Response.json({ error: "Answer is required" }, { status: 400 })
    }

    const round = await getRoundById(roundId)
    if (!round) {
      return Response.json({ error: "Round not found" }, { status: 404 })
    }

    const result = await answerRound(roundId, user_answer_id)

    preGenerateNextRound(round.sessionId).catch(console.error)

    return Response.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
```

- [ ] **Step 3: Create next round route**

```typescript
// app/api/ost-detective/round/next/route.ts
import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getNextReadyRound } from "../../game-round.service"

export async function GET(request: NextRequest) {
  try {
    await getAuthUserId()
    const sessionId = request.nextUrl.searchParams.get("sessionId")

    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 })
    }

    const round = await getNextReadyRound(sessionId)

    if (!round) {
      return Response.json({ data: { status: "pending" } })
    }

    return Response.json({ data: round })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
```

- [ ] **Step 4: Create summary route**

```typescript
// app/api/ost-detective/session/[sessionId]/summary/route.ts
import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getSessionById } from "../../../../game-session.repository"
import { getSessionRounds } from "../../../../game-round.service"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await getAuthUserId()
    const { sessionId } = await params

    const session = await getSessionById(sessionId)
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    const rounds = await getSessionRounds(sessionId)

    return Response.json({ data: { session, rounds } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
```

- [ ] **Step 5: Create leaderboard route**

```typescript
// app/api/ost-detective/leaderboard/route.ts
import { getLeaderboard } from "../../game-session.repository"

export async function GET() {
  try {
    const sessions = await getLeaderboard(10)
    return Response.json({ data: sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/ost-detective/
git commit -m "feat: add OST Detective API routes"
```

---

## Task 11: Frontend Game Screen

**Files:**
- Create: `app/ost-detective/page.tsx`

- [ ] **Step 1: Create game page**

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { gameRound, gameSession } from "@/types/ostDetective"

export default function OstDetectivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [gameSession, setGameSession] = useState<gameSession | null>(null)
  const [currentRound, setCurrentRound] = useState<gameRound | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [narratorText, setNarratorText] = useState<string | null>(null)
  const [narratorAudio, setNarratorAudio] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [audioStarted, setAudioStarted] = useState(false)
  const [summary, setSummary] = useState<{ session: gameSession; rounds: gameRound[] } | null>(null)

  const startGame = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ost-detective/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "classic" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGameSession({ id: data.data.sessionId, userId: "", score: 0, streak: 0, mode: "classic", createdAt: "" })
      setCurrentRound(data.data.round)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitAnswer = useCallback(async (answerId: string) => {
    if (!currentRound || selectedAnswer) return
    setSelectedAnswer(answerId)
    setShowResult(true)

    try {
      const res = await fetch(`/api/ost-detective/round/${currentRound.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_answer_id: answerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNarratorText(data.data.narratorLine)
      setNarratorAudio(data.data.narratorAudioUrl)
      setGameSession(prev => prev ? { ...prev, score: data.data.updatedScore, streak: data.data.updatedStreak } : prev)
    } catch (err) {
      console.error(err)
    }
  }, [currentRound, selectedAnswer])

  const nextRound = useCallback(async () => {
    if (!gameSession) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ost-detective/round/next?sessionId=${gameSession.id}`)
      const data = await res.json()
      if (data.data.status === "pending") {
        await new Promise(r => setTimeout(r, 500))
        return nextRound()
      }
      setCurrentRound(data.data)
      setSelectedAnswer(null)
      setShowResult(false)
      setNarratorText(null)
      setNarratorAudio(null)
      setAudioStarted(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [gameSession])

  const endGame = useCallback(async () => {
    if (!gameSession) return
    const res = await fetch(`/api/ost-detective/session/${gameSession.id}/summary`)
    const data = await res.json()
    setSummary(data.data)
    setGameOver(true)
  }, [gameSession])

  useEffect(() => {
    if (narratorAudio && audioRef.current) {
      audioRef.current.src = narratorAudio
      audioRef.current.play().catch(() => {})
    }
  }, [narratorAudio])

  useEffect(() => {
    if (currentRound?.status === "ready" && audioRef.current && !showResult) {
      audioRef.current.src = currentRound.options.find(o => o.id === currentRound.correctId)
        ? "/audio/tracks/placeholder.mp3"
        : ""
    }
  }, [currentRound, showResult])

  if (status === "loading") return <div className="p-8 text-on-background">Loading...</div>
  if (!session) { router.push("/sign-in"); return null }

  if (gameOver && summary) {
    const correct = summary.rounds.filter(r => r.isCorrect).length
    return (
      <div className="min-h-screen bg-background text-on-background p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-6">Game Over!</h1>
          <div className="bg-surface-container rounded-2xl p-6 mb-6">
            <p className="text-2xl font-bold">Score: {summary.session.score}</p>
            <p className="text-lg text-on-surface-variant">Best Streak: {summary.session.streak}</p>
            <p className="text-on-surface-variant">{correct}/{summary.rounds.length} correct</p>
          </div>
          <div className="space-y-3">
            {summary.rounds.map((round, i) => (
              <div key={round.id} className={`p-4 rounded-xl ${round.isCorrect ? "bg-green-900/30" : "bg-red-900/30"}`}>
                <p className="font-medium">Round {i + 1}: {round.isCorrect ? "Correct" : "Wrong"}</p>
                {round.narratorLine && <p className="text-sm text-on-surface-variant mt-1">{round.narratorLine}</p>}
              </div>
            ))}
          </div>
          <button onClick={() => { setGameOver(false); setSummary(null); setGameSession(null); setCurrentRound(null) }}
            className="mt-6 w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold">
            Play Again
          </button>
        </div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold mb-4">OST Detective</h1>
          <p className="text-on-surface-variant mb-8">Guess the source of game & anime soundtracks</p>
          <button onClick={startGame} disabled={loading}
            className="px-8 py-4 rounded-xl bg-[#E6192E] text-white font-semibold text-lg hover:bg-[#b91c1c] disabled:opacity-50">
            {loading ? "Starting..." : "Start Game"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-on-surface-variant">Score</p>
            <p className="text-2xl font-bold">{gameSession.score}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-on-surface-variant">Streak</p>
            <p className="text-2xl font-bold">{gameSession.streak}</p>
          </div>
        </div>

        {currentRound && (
          <>
            <div className="bg-surface-container rounded-2xl p-6 mb-6">
              <p className="text-sm text-on-surface-variant mb-2">Round {currentRound.roundIndex}</p>
              <p className="text-xl font-medium">{currentRound.questionText}</p>
            </div>

            <audio ref={audioRef} />

            {!audioStarted && (
              <button onClick={() => { setAudioStarted(true); audioRef.current?.play().catch(() => {}) }}
                className="w-full py-4 mb-6 rounded-xl bg-surface-container text-on-surface font-medium">
                Play Clip
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentRound.options.map(option => (
                <button key={option.id} onClick={() => submitAnswer(option.id)}
                  disabled={!!selectedAnswer}
                  className={`p-4 rounded-xl text-left transition-all ${
                    selectedAnswer === option.id
                      ? option.id === currentRound.correctId
                        ? "bg-green-900/50 border-2 border-green-500"
                        : "bg-red-900/50 border-2 border-red-500"
                      : showResult && option.id === currentRound.correctId
                        ? "bg-green-900/30 border-2 border-green-500"
                        : "bg-surface-container hover:bg-surface-container-high border-2 border-transparent"
                  }`}>
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-on-surface-variant">{option.sourceName}</p>
                </button>
              ))}
            </div>

            {showResult && narratorText && (
              <div className="bg-surface-container rounded-2xl p-6 mb-6">
                <p className="text-on-surface-variant mb-2">Narrator</p>
                <p className="text-lg">{narratorText}</p>
                {narratorAudio && <audio ref={audioRef} src={narratorAudio} autoPlay />}
              </div>
            )}

            {showResult && (
              <div className="flex gap-3">
                <button onClick={nextRound} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#E6192E] text-white font-semibold disabled:opacity-50">
                  {loading ? "Loading..." : "Next Round"}
                </button>
                <button onClick={endGame}
                  className="px-6 py-3 rounded-xl bg-surface-container text-on-surface font-medium">
                  End Game
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/ost-detective/page.tsx
git commit -m "feat: add OST Detective game screen"
```

---

## Task 12: TypeScript Check and Lint

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript and lint issues for OST Detective"
```

---

## Task 13: Test Complete Flow

**Files:** None (verification only)

- [ ] **Step 1: Verify database migration ran successfully**

```bash
PGPASSWORD='pwd$4$Postgres' psql -h localhost -U postgres -d postgres -c "\d track"
PGPASSWORD='pwd$4$Postgres' psql -h localhost -U postgres -d postgres -c "\d game_round"
PGPASSWORD='pwd$4$Postgres' psql -h localhost -U postgres -d postgres -c "SELECT COUNT(*) FROM track"
```

Expected: Tables exist, 30 tracks seeded

- [ ] **Step 2: Verify all API routes are accessible**

Test each route manually or with curl:
- POST /api/ost-detective/session/start
- POST /api/ost-detective/round/:roundId/answer
- GET /api/ost-detective/round/next?sessionId=...
- GET /api/ost-detective/session/:sessionId/summary
- GET /api/ost-detective/leaderboard

- [ ] **Step 3: Play through a full game session**

Start game → answer 5+ rounds → verify no loading delays between rounds → verify narrator reactions play → verify score/streak update → end game and see summary

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: OST Detective module complete"
```
