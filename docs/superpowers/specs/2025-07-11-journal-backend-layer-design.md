# Journal Backend Layer — Design Spec

**Date**: 2025-07-11
**Module**: Devotion Log (Anchor MVP)
**Scope**: Repository, Service, Controller for journal entries

---

## Overview

Build a 3-layer backend for journal entries following a clean architecture pattern (repository → service → controller) that will be repeated for timeline and recap.

## File Structure

```
app/api/devotion-log/journal/
├── route.ts              # Controller — Next.js route handlers (GET, POST, PUT, DELETE)
├── journal.service.ts    # Service — business logic, validation
└── journal.repository.ts # Repository — raw SQL queries via pg
```

## Data Model

JournalEntry (from project-structure.md):

| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | Primary key |
| userId | string | FK to users |
| date | DateTime | Default: now() |
| mediaType | enum | GAME, ANIME, SONG |
| title | string | Required |
| note | string? | Optional |
| voiceTranscript | string? | Optional |
| mood | string? | Optional |
| createdAt | DateTime | Default: now() |

## Layer Responsibilities

### Repository (`journal.repository.ts`)

Raw SQL queries only. No business logic. Imports pg Pool from `@/lib/db`.

Methods:
- `findManyByUserId(userId: string, filters?: { startDate?: Date, endDate?: Date })` — SELECT with optional date range WHERE clause
- `findById(id: string)` — SELECT by primary key
- `create(data: CreateJournalEntry)` — INSERT, returns created row
- `update(id: string, data: UpdateJournalEntry)` — UPDATE, returns updated row
- `remove(id: string)` — DELETE, returns deleted row

### Service (`journal.service.ts`)

Business logic and validation. Imports repository.

- Validates mediaType is one of the enum values
- Validates required fields (title, userId, mediaType)
- Delegates all DB operations to repository
- Same method signatures as repository (thin service for now, grows with business rules)

### Controller (`route.ts`)

Next.js App Router route handlers. Imports service.

- `GET /api/devotion-log/journal` — list entries (userId from query param, optional startDate/endDate)
- `GET /api/devotion-log/journal/[id]` — single entry by ID
- `POST /api/devotion-log/journal` — create entry from JSON body
- `PUT /api/devotion-log/journal/[id]` — update entry
- `DELETE /api/devotion-log/journal/[id]` — delete entry

Response format:
- Success: `{ data: result }`
- Error: `{ error: string }` with appropriate HTTP status

## Dependencies (not created in this task)

- `@/lib/db` — exports pg Pool instance
- `@/types/journal` — exports JournalEntry, CreateJournalEntry, UpdateJournalEntry types
- PostgreSQL database with journal_entries table

## Conventions

- All code in camelCase (functions, variables, types)
- Files in kebab-case where applicable (route.ts is fixed by Next.js)
- No `any` types — strict TypeScript
- Parameterized SQL queries only (no string interpolation)
- Server Components by default, but route handlers are always server-side
