# Clerk ↔ PostgreSQL User Sync — Auth Design

**Date:** 2026-07-11
**Status:** Approved
**Scope:** Full authentication system — Clerk sessions synced to local PostgreSQL user table

---

## Problem

The project uses Clerk for auth UI (sign-in/sign-up) but:
1. The middleware file is misnamed (`proxy.ts` instead of `middleware.ts`) — so it never runs
2. API routes have zero auth — they accept `userId` from the client (hardcoded `"user1"`)
3. The database `user` table has no link to Clerk user IDs
4. Unauthenticated users can access all routes

## Solution

Keep Clerk for auth UI. Add a webhook to sync Clerk users into PostgreSQL. Fix middleware so all routes except sign-in/sign-up are protected.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser   │────▶│  Next.js Server  │────▶│  PostgreSQL  │
│             │     │                  │     │              │
│ Clerk SDK   │     │ middleware.ts    │     │ user table   │
│ (React)     │     │ (auth check)     │     │ (clerk_id)   │
│             │     │                  │     │              │
│ useAuth()   │     │ API routes       │     │ journal_entry│
│ isSignedIn  │     │ (getAuthUserId)  │     │ ...          │
└─────────────┘     └──────────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Clerk Webhooks   │
                    │ POST /api/       │
                    │ webhooks/clerk   │
                    │ (sync user→DB)   │
                    └──────────────────┘
```

**Data flow:**
1. User hits any page → `middleware.ts` checks Clerk session → no session → redirect to `/sign-in`
2. User logs in via Clerk → Clerk SDK handles it → `isSignedIn = true`
3. Clerk fires `user.created` webhook → `/api/webhooks/clerk` upserts into `user` table with `clerk_id`
4. API routes call `getAuthUserId()` → gets Clerk userId → queries DB for local user record → uses `user.id` (UUID) for all queries
5. Frontend pages use `useAuth()` to conditionally render

---

## Database Changes

### Migration: Add `clerk_id` to `user` table

```sql
ALTER TABLE "user" ADD COLUMN clerk_id TEXT UNIQUE;
CREATE INDEX idx_user_clerk_id ON "user" (clerk_id);
```

The `clerk_id` column stores Clerk's `user.id` (e.g., `user_2abc123`). This is the bridge between Clerk sessions and local user records.

---

## New Files

### 1. `middleware.ts` (project root)

Replaces the broken `proxy.ts`. Uses Clerk's `clerkMiddleware` with route matching.

**Public routes** (no auth required):
- `/sign-in(.*)` — Clerk sign-in page
- `/sign-up(.*)` — Clerk sign-up page
- `/` — Landing page (shows sign-up form)
- `/api/webhooks/clerk(.*)` — Clerk webhook endpoint

**Protected routes** (auth required):
- All module pages: `/devotion-log`, `/passion-card`, `/ost-detective`, `/karaoke-judge`
- All API routes: `/api/*` (except webhook)

### 2. `app/api/webhooks/clerk/route.ts`

Webhook handler for Clerk events.

- **POST** — receives Clerk webhook payload
- Verifies webhook signature using `svix` library (Clerk's recommended approach)
- Events handled:
  - `user.created` → INSERT into `user` table (clerk_id, name, email, image_url)
  - `user.updated` → UPDATE `user` table by clerk_id
  - `user.deleted` → DELETE from `user` table by clerk_id
- Returns 200 on success, 400 on invalid signature, 500 on DB error

**Clerk event payload shape:**
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://..."
  }
}
```

### 3. `lib/auth.ts`

Auth helper for API routes.

```ts
import { auth } from "@clerk/nextjs/server"
import { query } from "./db"

export async function getAuthUserId(): Promise<string> {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthorized")

  const { rows } = await query(
    'SELECT id FROM "user" WHERE clerk_id = $1',
    [clerkId]
  )
  if (!rows[0]) throw new Error("User not found in database")
  return rows[0].id
}
```

Returns the **local UUID** (not Clerk ID) so all foreign key references work.

---

## Modified Files

### API Routes — Remove hardcoded userId

All existing routes get the same change: replace client-provided userId with server-side extraction.

**Files affected:**
- `app/api/devotion-log/journal/route.ts` — GET, POST
- `app/api/devotion-log/journal/[id]/route.ts` — GET, PUT, DELETE
- `app/api/devotion-log/recap/route.ts` — GET, POST
- `app/api/passion-card/route.ts` — GET, POST
- `app/api/passion-card/[id]/route.ts` — GET

**Pattern:**

Before:
```ts
const userId = request.nextUrl.searchParams.get("userId") || "user1"
// or
const { userId } = await request.json()
```

After:
```ts
const userId = await getAuthUserId()
```

Error handling: wrap in try/catch, return 401 if `getAuthUserId()` throws.

### Frontend Pages — Remove userId from fetch calls

**Files affected:**
- `app/devotion-log/page.tsx`
- `app/devotion-log/timeline/page.tsx`
- `app/devotion-log/recap/page.tsx`
- `app/passion-card/page.tsx`

**Pattern:** Remove any `userId` query param or body field from `fetch()` calls. The server extracts it from the Clerk session.

Before:
```ts
const res = await fetch(`/api/devotion-log/journal?userId=user1`)
```

After:
```ts
const res = await fetch("/api/devotion-log/journal")
```

### Delete `proxy.ts`

The broken middleware file at project root. Replaced by `middleware.ts`.

---

## Dependencies

Add `svix` package for webhook signature verification:
```bash
npm install svix
```

---

## Environment Variables

Add to `.env`:
```
CLERK_WEBHOOK_SECRET=whsec_...
```

This is the webhook signing secret from Clerk Dashboard → Webhooks → Endpoint → Signing Secret.

Existing Clerk variables stay the same:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No Clerk session | Middleware redirects to `/sign-in` |
| Valid session, user not in DB | `getAuthUserId()` throws → API returns 401 |
| Invalid webhook signature | Returns 400 Bad Request |
| DB error during webhook sync | Returns 500, logs error |
| Clerk webhook for unknown user | Upserts (creates new user record) |

---

## What Stays the Same

- All Clerk UI components (SignIn, SignUp, ClerkProvider in layout)
- Existing page component structure
- Database schema (only addition: `clerk_id` column)
- AI integrations (Gemini, ElevenLabs)
- All existing type definitions

---

## Testing Checklist

1. Middleware redirects unauthenticated users to `/sign-in`
2. Sign-in/sign-up pages work normally
3. After sign-in, user can access all module pages
4. Clerk webhook creates user in PostgreSQL on first sign-up
5. API routes return 401 when called without valid session
6. API routes work correctly when called with valid session
7. Journal entries, recaps, and passion cards are scoped to the authenticated user
8. Multiple users see only their own data
