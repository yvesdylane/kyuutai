# Journal Backend Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the journal repository, service, and controller following a 3-layer pattern (repository → service → controller) that will be repeated for timeline and recap.

**Architecture:** Colocated files in `app/api/devotion-log/journal/`. Repository handles raw SQL via pg Pool. Service adds validation. Controller exposes REST endpoints via Next.js route handlers.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, pg (raw SQL), Web Request/Response APIs

---

## File Structure

```
app/api/devotion-log/journal/
├── route.ts              # Controller — GET, POST, PUT, DELETE handlers
├── journal.service.ts    # Service — validation + business logic
└── journal.repository.ts # Repository — raw SQL queries
```

Shared dependencies (not created here, assumed to exist):
- `lib/db.ts` — exports `pg` Pool as default export
- `types/journal.ts` — exports `JournalEntry`, `CreateJournalEntry`, `UpdateJournalEntry`

---

### Task 1: Create types file

**Files:**
- Create: `types/journal.ts`

Since shared types don't exist yet, create a minimal types file that the repository and service will import.

- [ ] **Step 1: Create types/journal.ts**

```ts
export type MediaType = "GAME" | "ANIME" | "SONG"

export interface JournalEntry {
  id: string
  userId: string
  date: Date
  mediaType: MediaType
  title: string
  note: string | null
  voiceTranscript: string | null
  mood: string | null
  createdAt: Date
}

export interface CreateJournalEntry {
  userId: string
  mediaType: MediaType
  title: string
  date?: Date
  note?: string
  voiceTranscript?: string
  mood?: string
}

export interface UpdateJournalEntry {
  mediaType?: MediaType
  title?: string
  date?: Date
  note?: string
  voiceTranscript?: string
  mood?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/journal.ts
git commit -m "feat: add journal entry types"
```

---

### Task 2: Create the database connection

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Create lib/db.ts**

```ts
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default pool
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add PostgreSQL connection pool"
```

---

### Task 3: Build journal.repository.ts

**Files:**
- Create: `app/api/devotion-log/journal/journal.repository.ts`

- [ ] **Step 1: Create journal.repository.ts**

```ts
import pool from "@/lib/db"
import type {
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry,
} from "@/types/journal"

export async function findManyByUserId(
  userId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<JournalEntry[]> {
  let query = "SELECT * FROM journal_entries WHERE user_id = $1"
  const params: (string | Date)[] = [userId]

  if (filters?.startDate) {
    params.push(filters.startDate)
    query += ` AND date >= $${params.length}`
  }
  if (filters?.endDate) {
    params.push(filters.endDate)
    query += ` AND date <= $${params.length}`
  }

  query += " ORDER BY date DESC"

  const result = await pool.query(query, params)
  return result.rows
}

export async function findById(id: string): Promise<JournalEntry | null> {
  const result = await pool.query("SELECT * FROM journal_entries WHERE id = $1", [id])
  return result.rows[0] ?? null
}

export async function create(data: CreateJournalEntry): Promise<JournalEntry> {
  const result = await pool.query(
    `INSERT INTO journal_entries (user_id, date, media_type, title, note, voice_transcript, mood)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.userId,
      data.date ?? new Date(),
      data.mediaType,
      data.title,
      data.note ?? null,
      data.voiceTranscript ?? null,
      data.mood ?? null,
    ]
  )
  return result.rows[0]
}

export async function update(
  id: string,
  data: UpdateJournalEntry
): Promise<JournalEntry | null> {
  const fields: string[] = []
  const values: (string | Date | null)[] = []
  let paramIndex = 1

  if (data.mediaType !== undefined) {
    fields.push(`media_type = $${paramIndex++}`)
    values.push(data.mediaType)
  }
  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`)
    values.push(data.title)
  }
  if (data.date !== undefined) {
    fields.push(`date = $${paramIndex++}`)
    values.push(data.date)
  }
  if (data.note !== undefined) {
    fields.push(`note = $${paramIndex++}`)
    values.push(data.note)
  }
  if (data.voiceTranscript !== undefined) {
    fields.push(`voice_transcript = $${paramIndex++}`)
    values.push(data.voiceTranscript)
  }
  if (data.mood !== undefined) {
    fields.push(`mood = $${paramIndex++}`)
    values.push(data.mood)
  }

  if (fields.length === 0) {
    return findById(id)
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE journal_entries SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  )
  return result.rows[0] ?? null
}

export async function remove(id: string): Promise<JournalEntry | null> {
  const result = await pool.query(
    "DELETE FROM journal_entries WHERE id = $1 RETURNING *",
    [id]
  )
  return result.rows[0] ?? null
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/devotion-log/journal/journal.repository.ts
git commit -m "feat: add journal repository with raw SQL queries"
```

---

### Task 4: Build journal.service.ts

**Files:**
- Create: `app/api/devotion-log/journal/journal.service.ts`

- [ ] **Step 1: Create journal.service.ts**

```ts
import * as journalRepository from "./journal.repository"
import type {
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry,
} from "@/types/journal"

const VALID_MEDIA_TYPES = ["GAME", "ANIME", "SONG"] as const

function validateCreate(data: CreateJournalEntry): void {
  if (!data.userId) throw new Error("userId is required")
  if (!data.title) throw new Error("title is required")
  if (!data.mediaType || !VALID_MEDIA_TYPES.includes(data.mediaType)) {
    throw new Error(`mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`)
  }
}

function validateUpdate(data: UpdateJournalEntry): void {
  if (data.mediaType !== undefined && !VALID_MEDIA_TYPES.includes(data.mediaType)) {
    throw new Error(`mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`)
  }
  if (data.title !== undefined && !data.title) {
    throw new Error("title cannot be empty")
  }
}

export async function getJournalEntries(
  userId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<JournalEntry[]> {
  return journalRepository.findManyByUserId(userId, filters)
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  return journalRepository.findById(id)
}

export async function createJournalEntry(
  data: CreateJournalEntry
): Promise<JournalEntry> {
  validateCreate(data)
  return journalRepository.create(data)
}

export async function updateJournalEntry(
  id: string,
  data: UpdateJournalEntry
): Promise<JournalEntry | null> {
  validateUpdate(data)
  return journalRepository.update(id, data)
}

export async function deleteJournalEntry(
  id: string
): Promise<JournalEntry | null> {
  return journalRepository.remove(id)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/devotion-log/journal/journal.service.ts
git commit -m "feat: add journal service with validation"
```

---

### Task 5: Build the controller (route.ts)

**Files:**
- Create: `app/api/devotion-log/journal/route.ts`
- Create: `app/api/devotion-log/journal/[id]/route.ts`

- [ ] **Step 1: Create app/api/devotion-log/journal/route.ts**

```ts
import { NextRequest } from "next/server"
import * as journalService from "./journal.service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    const startDate = searchParams.get("startDate") ?? undefined
    const endDate = searchParams.get("endDate") ?? undefined

    const data = await journalService.getJournalEntries(userId, {
      startDate,
      endDate,
    })
    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await journalService.createJournalEntry(body)
    return Response.json({ data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = message.includes("required") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
```

- [ ] **Step 2: Create app/api/devotion-log/journal/[id]/route.ts**

```ts
import { NextRequest } from "next/server"
import * as journalService from "../journal.service"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await journalService.getJournalEntry(id)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await journalService.updateJournalEntry(id, body)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = message.includes("cannot be empty") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await journalService.deleteJournalEntry(id)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/devotion-log/journal/route.ts app/api/devotion-log/journal/\[id\]/route.ts
git commit -m "feat: add journal route handlers (GET, POST, PUT, DELETE)"
```

---

### Task 6: Install pg and verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install pg**

```bash
npm install pg
npm install -D @types/pg
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pg dependency"
```
