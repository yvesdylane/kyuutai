# Fandom Devotion Platform — Agent Guidelines

## Project Overview

A "Fandom Devotion Platform" with 4 modules built in Next.js 16 (App Router) + raw SQL (PostgreSQL).

- **Anchor MVP**: Devotion Log (journal → timeline → weekly recap)
- **Module A**: Passion Card (favorites → AI profile)
- **Module B**: OST Detective (blind test mini-game)
- **Module C**: Karaoke Judge (record → AI roast)

**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, PostgreSQL (raw SQL via `pg`), Google Gemini AI, ElevenLabs TTS.

---

## Git Branching Strategy

### Branches

| Branch | Purpose | Who works here |
|---|---|---|
| `main` | Shared infrastructure (types, lib/, components/, db/, shared API routes) | infra maintainer |
| `module/devotion-log` | Devotion Log module | devotion-log developer |
| `module/passion-card` | Passion Card module | passion-card developer |
| `module/ost-detective` | OST Detective module | ost-detective developer |
| `module/karaoke-judge` | Karaoke Judge module | karaoke-judge developer |

### Rules

1. **Always pull before push**: `git pull origin main` (or your base branch) before pushing
2. **Module branches only modify their own files** — never edit shared files on a module branch
3. **Shared code is frozen on `main`** — if you need to change shared code, do it on `main` first, then merge
4. **Switch to your module branch before starting work**: `git checkout module/<your-module>`
5. **No direct pushes to `main`** — all changes go through PRs or careful merge

### File Ownership

| Owner | Files |
|---|---|
| `main` (shared) | `types/`, `lib/`, `components/`, `db/`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/api/ai/`, `app/api/voice/`, `app/api/auth/` |
| `module/devotion-log` | `app/devotion-log/`, `app/api/devotion-log/` |
| `module/passion-card` | `app/passion-card/`, `app/api/passion-card/` |
| `module/ost-detective` | `app/ost-detective/`, `app/api/ost-detective/` |
| `module/karaoke-judge` | `app/karaoke-judge/`, `app/api/karaoke-judge/` |

**Conflict prevention**: If a module needs a new shared type or utility, request it on `main` first. Never create duplicate shared files.

---

## Project Structure

```
kyuutai/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (SHARED)
│   ├── page.tsx                      # Landing page (SHARED)
│   ├── globals.css                   # Global styles (SHARED)
│   │
│   ├── devotion-log/                 # Module: Devotion Log
│   │   ├── page.tsx
│   │   └── timeline/
│   │       └── page.tsx
│   │
│   ├── passion-card/                 # Module A
│   │   └── page.tsx
│   │
│   ├── ost-detective/                # Module B
│   │   └── page.tsx
│   │
│   ├── karaoke-judge/                # Module C
│   │   └── page.tsx
│   │
│   └── api/                          # Backend API routes
│       ├── devotion-log/
│       │   ├── journal/
│       │   │   └── route.ts
│       │   ├── timeline/
│       │   │   └── route.ts
│       │   └── recap/
│       │       └── route.ts
│       │
│       ├── passion-card/
│       │   └── route.ts
│       │
│       ├── ost-detective/
│       │   ├── clip/
│       │   │   └── route.ts
│       │   └── guess/
│       │       └── route.ts
│       │
│       ├── karaoke-judge/
│       │   └── route.ts
│       │
│       ├── ai/                       # Shared AI service
│       │   └── route.ts
│       │
│       ├── voice/                    # Shared Voice service
│       │   └── route.ts
│       │
│       └── auth/                     # Auth endpoints
│           ├── login/
│           │   └── route.ts
│           └── register/
│               └── route.ts
│
├── lib/                              # Shared server-side code (SHARED)
│   ├── db.ts                         # PostgreSQL connection pool
│   ├── ai.ts                         # Google Gemini client
│   ├── voice.ts                      # ElevenLabs TTS client
│   ├── auth.ts                       # JWT/session helpers
│   └── utils.ts                      # Shared utilities
│
├── types/                            # Shared TypeScript types (SHARED)
│   ├── index.ts                      # Re-exports
│   ├── journal.ts
│   ├── timeline.ts
│   ├── passionCard.ts
│   ├── ostDetective.ts
│   ├── karaokeJudge.ts
│   ├── ai.ts
│   ├── voice.ts
│   └── user.ts
│
├── components/                       # Shared UI components (SHARED)
│   ├── ui/                           # Button, Modal, Card, AudioPlayer
│   └── layout/                       # Nav, Header, Footer
│
├── db/                               # Database (SHARED)
│   ├── schema.sql                    # Full schema
│   └── migrations/                   # Migration files
│
├── public/                           # Static assets
├── .env                              # Environment variables (gitignored)
└── package.json
```

---

## Next.js 16 Conventions

**This is Next.js 16 — APIs have breaking changes from earlier versions. Always check `node_modules/next/dist/docs/` before writing code.**

### Pages (App Router)

- Every page is a `page.tsx` file inside a folder under `app/`
- Pages are React Server Components by default — add `"use client"` only when needed (interactive state, event handlers, browser APIs)
- Use `PageProps` helper for typed params/searchParams (globally available, no import needed)
- Example:
  ```tsx
  export default async function Page(props: PageProps<'/devotion-log'>) {
    return <h1>Journal</h1>
  }
  ```

### Route Handlers (API)

- Defined in `route.ts` files inside `app/api/`
- Export named functions for HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Use Web `Request`/`Response` APIs (or `NextRequest`/`NextResponse` for helpers)
- Route handlers are **not cached by default**
- **Cannot** have `route.ts` at the same level as `page.ts` — use `app/api/` prefix for API routes
- Example:
  ```ts
  import { NextRequest } from 'next/server'

  export async function GET(request: NextRequest) {
    const data = await fetchData()
    return Response.json(data)
  }

  export async function POST(request: NextRequest) {
    const body = await request.json()
    const result = await createSomething(body)
    return Response.json(result, { status: 201 })
  }
  ```

### Layouts

- Root layout (`app/layout.tsx`) is required and must contain `<html>` and `<body>`
- Layouts persist across navigations and don't re-render
- Use nested layouts for module-specific shared UI

### Data Fetching

- Server Components can fetch data directly (async components)
- For client-side fetching, use `fetch` or a typed API client in `lib/`
- Dynamic rendering: use `headers()`, `cookies()`, or `searchParams` — these opt out of static rendering

---

## Backend Conventions

### Data Access (Raw SQL)

- Database connection: `lib/db.ts` exports a `pg` Pool instance
- Model files: Create model files for each module (e.g., `lib/models/journal.ts`)
- Use parameterized queries to prevent SQL injection: `pool.query('SELECT * FROM users WHERE id = $1', [userId])`
- Export async functions from model files, called by route handlers

### API Response Format

All API routes should return consistent JSON responses:

```ts
// Success
return Response.json({ data: result })

// Error
return Response.json({ error: 'Message' }, { status: 400 })
```

### Environment Variables

Required variables (see `.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_AI_API_KEY` — Gemini API key
- `ELEVENLABS_API_KEY` — ElevenLabs API key
- `JWT_SECRET` — Secret for JWT tokens

---

## Code Style

### Naming Conventions

Everything uses **camelCase** (`newThing` style) — functions, variables, types, interfaces. No exceptions.

The only places with dots or other characters:
- **Files/folders**: kebab-case (`devotion-log/`, `journal-entry.tsx`)
- **File extensions**: the single dot before the extension is the only dot allowed (`.ts`, `.tsx`, `.sql`)
- **No file or folder name may contain `.` twice** — e.g. `my.file.ts` is forbidden, `myFile.ts` is fine
- **API route files**: always `route.ts` inside a kebab-case folder

| What | Convention | Example |
|---|---|---|
| Functions | camelCase | `getJournalEntries`, `formatDate` |
| Variables | camelCase | `journalList`, `mediaType` |
| Types/Interfaces | camelCase | `journalEntry`, `mediaType` |
| Component files | camelCase | `journalEntryForm.tsx` |
| API route files | `route.ts` | `app/api/devotion-log/journal/route.ts` |
| Folders | kebab-case | `devotion-log/`, `passion-card/` |

### TypeScript

- Use strict TypeScript — no `any` types
- Define types in `types/` for shared, or colocated for module-specific
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from `types/index.ts` for easy imports

### React Components

- Server Components by default — only add `"use client"` when necessary
- Keep components small and focused
- Colocate module-specific components in `app/<module>/components/`
- Shared components go in `components/ui/` or `components/layout/`

---

## Quick Reference — Module Developer Workflow

```bash
# 1. Switch to your module branch
git checkout module/devotion-log

# 2. Pull latest shared code
git pull origin main

# 3. Create your files (pages, API routes, models)
# app/devotion-log/page.tsx
# app/api/devotion-log/journal/route.ts
# lib/models/journal.ts

# 4. Test locally
npm run dev

# 5. Pull again before pushing (in case main was updated)
git pull origin main

# 6. Push your module branch
git push origin module/devotion-log

# 7. Create PR to merge into main when ready
```
