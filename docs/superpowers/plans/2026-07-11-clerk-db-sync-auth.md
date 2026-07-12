# Clerk ↔ PostgreSQL User Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full authentication by keeping Clerk for UI, syncing Clerk users to PostgreSQL via webhook, fixing middleware, and securing all API routes.

**Architecture:** Clerk handles sign-in/sign-up UI. A webhook endpoint syncs Clerk user events to the local `user` table. Middleware protects all routes except public ones. API routes extract the authenticated user's local UUID via `getAuthUserId()`.

**Tech Stack:** Next.js 16, Clerk (`@clerk/nextjs`), PostgreSQL (`pg`), `svix` (webhook verification)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `middleware.ts` | Next.js middleware with Clerk auth |
| Create | `app/api/webhooks/clerk/route.ts` | Webhook handler for Clerk events |
| Create | `lib/auth.ts` | Auth helper — extract userId from session |
| Modify | `app/api/devotion-log/journal/route.ts` | Remove hardcoded userId |
| Modify | `app/api/devotion-log/journal/[id]/route.ts` | Remove hardcoded userId |
| Modify | `app/api/devotion-log/recap/route.ts` | Remove hardcoded userId |
| Modify | `app/api/passion-card/route.ts` | Remove hardcoded userId |
| Modify | `app/api/passion-card/[id]/route.ts` | Remove hardcoded userId |
| Modify | `app/devotion-log/page.tsx` | Remove userId from fetch calls |
| Modify | `app/devotion-log/timeline/page.tsx` | Remove userId from fetch calls |
| Modify | `app/devotion-log/recap/page.tsx` | Remove userId from fetch calls |
| Modify | `app/passion-card/page.tsx` | Remove userId from fetch calls |
| Modify | `db/schema.sql` | Add `clerk_id` column to user table |
| Delete | `proxy.ts` | Broken middleware file |

---

### Task 1: Install svix dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install svix**

```bash
npm install svix
```

- [ ] **Step 2: Verify installation**

```bash
npm ls svix
```
Expected: `svix@<version>` in output

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add svix for Clerk webhook verification"
```

---

### Task 2: Database migration — add clerk_id column

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add clerk_id column to schema.sql**

Open `db/schema.sql`. In the `CREATE TABLE "user"` block, add `clerk_id TEXT UNIQUE` after the `id` column:

```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clerk_id TEXT UNIQUE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add index for clerk_id lookups**

After the CREATE TABLE statement, add:

```sql
CREATE INDEX idx_user_clerk_id ON "user" (clerk_id);
```

- [ ] **Step 3: Run migration against local DB**

```bash
psql "$DATABASE_URL" -f db/schema.sql
```
Expected: If table already exists, this will error on duplicate table. That's fine — run the ALTER instead:

```bash
psql "$DATABASE_URL" -c 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;'
psql "$DATABASE_URL" -c 'CREATE INDEX IF NOT EXISTS idx_user_clerk_id ON "user" (clerk_id);'
```

- [ ] **Step 4: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add clerk_id column to user table"
```

---

### Task 3: Create lib/auth.ts — auth helper

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create lib/auth.ts**

```ts
import { auth } from "@clerk/nextjs/server"
import { query } from "./db"

export async function getAuthUserId(): Promise<string> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new Error("Unauthorized")
  }

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM "user" WHERE clerk_id = $1',
    [clerkId]
  )

  if (!rows[0]) {
    throw new Error("User not found in database")
  }

  return rows[0].id
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit lib/auth.ts
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: add getAuthUserId helper for API routes"
```

---

### Task 4: Create middleware.ts — replace broken proxy.ts

**Files:**
- Create: `middleware.ts`
- Delete: `proxy.ts`

- [ ] **Step 1: Create middleware.ts at project root**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhooks/clerk(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
```

- [ ] **Step 2: Delete proxy.ts**

```bash
rm proxy.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit middleware.ts
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git rm proxy.ts
git commit -m "fix: replace broken proxy.ts with proper middleware.ts"
```

---

### Task 5: Create Clerk webhook endpoint

**Files:**
- Create: `app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Create the webhook route file**

```ts
import { NextRequest } from "next/server"
import { Webhook } from "svix"
import { query } from "@/lib/db"

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
    image_url?: string
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set")
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 })
  }

  const body = await request.text()

  const wh = new Webhook(webhookSecret)

  let event: ClerkWebhookEvent
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  const { type, data } = event

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const email = data.email_addresses?.[0]?.email_address || ""
        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null

        await query(
          `INSERT INTO "user" (clerk_id, name, email, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (clerk_id)
           DO UPDATE SET name = $2, email = $3, image_url = $4, updated_at = NOW()`,
          [data.id, name, email, data.image_url || null]
        )
        break
      }
      case "user.deleted": {
        await query('DELETE FROM "user" WHERE clerk_id = $1', [data.id])
        break
      }
      default:
        // Unhandled event type — acknowledge silently
        break
    }
  } catch (err) {
    console.error(`Error processing webhook event ${type}:`, err)
    return Response.json({ error: "Database error" }, { status: 500 })
  }

  return Response.json({ received: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/api/webhooks/clerk/route.ts
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/clerk/route.ts
git commit -m "feat: add Clerk webhook endpoint for user sync"
```

---

### Task 6: Update journal API routes — remove hardcoded userId

**Files:**
- Modify: `app/api/devotion-log/journal/route.ts`
- Modify: `app/api/devotion-log/journal/[id]/route.ts`

- [ ] **Step 1: Read current journal route files**

Read both files to understand the current implementation.

- [ ] **Step 2: Update app/api/devotion-log/journal/route.ts**

Add import for `getAuthUserId` at the top:

```ts
import { getAuthUserId } from "@/lib/auth"
```

In the **GET** handler, replace the userId extraction:

Before:
```ts
const userId = request.nextUrl.searchParams.get("userId") || "user1"
```

After:
```ts
let userId: string
try {
  userId = await getAuthUserId()
} catch {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

In the **POST** handler, replace the userId extraction:

Before:
```ts
const { userId, date, mediaType, title, note, voiceTranscript, mood } = await request.json()
```

After:
```ts
let userId: string
try {
  userId = await getAuthUserId()
} catch {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
const { date, mediaType, title, note, voiceTranscript, mood } = await request.json()
```

- [ ] **Step 3: Update app/api/devotion-log/journal/[id]/route.ts**

Add import for `getAuthUserId`:

```ts
import { getAuthUserId } from "@/lib/auth"
```

In each handler (GET, PUT, DELETE), add the same auth check pattern:

```ts
let userId: string
try {
  userId = await getAuthUserId()
} catch {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

Remove any `userId` parameter extraction from query params or request body in each handler.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/api/devotion-log/journal/route.ts app/api/devotion-log/journal/\[id\]/route.ts
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/devotion-log/journal/route.ts app/api/devotion-log/journal/\[id\]/route.ts
git commit -m "feat: secure journal API routes with Clerk auth"
```

---

### Task 7: Update recap API route — remove hardcoded userId

**Files:**
- Modify: `app/api/devotion-log/recap/route.ts`

- [ ] **Step 1: Read current recap route**

Read `app/api/devotion-log/recap/route.ts` to understand current implementation.

- [ ] **Step 2: Update recap route**

Add import:

```ts
import { getAuthUserId } from "@/lib/auth"
```

In both GET and POST handlers, replace userId extraction with:

```ts
let userId: string
try {
  userId = await getAuthUserId()
} catch {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

Remove any `userId` from query params or request body.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/api/devotion-log/recap/route.ts
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/devotion-log/recap/route.ts
git commit -m "feat: secure recap API route with Clerk auth"
```

---

### Task 8: Update passion-card API routes — remove hardcoded userId

**Files:**
- Modify: `app/api/passion-card/route.ts`
- Modify: `app/api/passion-card/[id]/route.ts`

- [ ] **Step 1: Read current passion-card route files**

Read both files to understand the current implementation.

- [ ] **Step 2: Update app/api/passion-card/route.ts**

Add import:

```ts
import { getAuthUserId } from "@/lib/auth"
```

In both GET and POST handlers, replace userId extraction with:

```ts
let userId: string
try {
  userId = await getAuthUserId()
} catch {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

Remove any `userId` from query params or request body.

- [ ] **Step 3: Update app/api/passion-card/[id]/route.ts**

Same pattern — add `getAuthUserId` import and auth check, remove userId from params.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit app/api/passion-card/route.ts app/api/passion-card/\[id\]/route.ts
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/passion-card/route.ts app/api/passion-card/\[id\]/route.ts
git commit -m "feat: secure passion-card API routes with Clerk auth"
```

---

### Task 9: Update frontend pages — remove userId from fetch calls

**Files:**
- Modify: `app/devotion-log/page.tsx`
- Modify: `app/devotion-log/timeline/page.tsx`
- Modify: `app/devotion-log/recap/page.tsx`
- Modify: `app/passion-card/page.tsx`

- [ ] **Step 1: Update app/devotion-log/page.tsx**

Search for any `fetch()` calls that include `userId` in the URL or body. Remove the `userId` parameter.

Before:
```ts
const res = await fetch(`/api/devotion-log/journal?userId=${userId}`)
```
or
```ts
const res = await fetch("/api/devotion-log/journal?userId=user1")
```

After:
```ts
const res = await fetch("/api/devotion-log/journal")
```

Also remove any `userId` in POST body:
Before:
```ts
const res = await fetch("/api/devotion-log/journal", {
  method: "POST",
  body: JSON.stringify({ userId, ... })
})
```

After:
```ts
const res = await fetch("/api/devotion-log/journal", {
  method: "POST",
  body: JSON.stringify({ ... })
})
```

- [ ] **Step 2: Update app/devotion-log/timeline/page.tsx**

Same pattern — remove `userId` from all fetch calls.

- [ ] **Step 3: Update app/devotion-log/recap/page.tsx**

Same pattern — remove `userId` from all fetch calls.

- [ ] **Step 4: Update app/passion-card/page.tsx**

Same pattern — remove `userId` from all fetch calls.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/devotion-log/page.tsx app/devotion-log/timeline/page.tsx app/devotion-log/recap/page.tsx app/passion-card/page.tsx
git commit -m "feat: remove hardcoded userId from frontend pages"
```

---

### Task 10: Add CLERK_WEBHOOK_SECRET to .env

**Files:**
- Modify: `.env`

- [ ] **Step 1: Add webhook secret placeholder to .env**

Add to `.env`:
```
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

The actual secret comes from Clerk Dashboard → Webhooks → Configure endpoint → Signing Secret.

- [ ] **Step 2: Commit**

```bash
git add .env
git commit -m "chore: add CLERK_WEBHOOK_SECRET to env"
```

Note: `.env` is gitignored so this commit only tracks the schema.sql and code changes. The actual secret value stays local.

---

### Task 11: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test middleware protection**

Open browser to `http://localhost:3000/devotion-log`
Expected: Redirect to `/sign-in` (Clerk sign-in page)

- [ ] **Step 3: Test sign-in flow**

Sign in via Clerk sign-in page
Expected: Redirect to `/devotion-log` after successful sign-in

- [ ] **Step 4: Test webhook sync**

In Clerk Dashboard, go to Webhooks and add endpoint `http://localhost:3000/api/webhooks/clerk`
Select events: `user.created`, `user.updated`, `user.deleted`
Copy the signing secret and update `CLERK_WEBHOOK_SECRET` in `.env`

Sign out and sign up with a new account. Check the database:
```bash
psql "$DATABASE_URL" -c 'SELECT * FROM "user";'
```
Expected: New row with `clerk_id` populated

- [ ] **Step 5: Test API route protection**

Open browser console on `/devotion-log` page. Try fetching API directly:
```js
fetch("/api/devotion-log/journal").then(r => console.log(r.status))
```
Expected: 200 (authenticated via session cookie)

Open incognito window (no session). Try the same fetch:
Expected: 401

- [ ] **Step 6: Test data isolation**

Create two different user accounts. Verify that User A's journal entries are not visible to User B.

- [ ] **Step 7: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: No errors

- [ ] **Step 8: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end verification"
```
