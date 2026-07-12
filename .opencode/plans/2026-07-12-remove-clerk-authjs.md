# Remove Clerk, Implement Auth.js v5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Clerk authentication entirely and replace with Auth.js v5 using Credentials provider (username/password) and JWT sessions.

**Architecture:** Auth.js v5 with Credentials provider handles authentication. JWT strategy for stateless sessions. Bcrypt for password hashing. Custom sign-up/sign-in pages with the existing UI components.

**Tech Stack:** `next-auth@beta`, `bcryptjs`, existing `pg` pool, existing UI components

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/auth.ts` | Auth.js configuration (replaces Clerk-based auth) |
| Create | `app/api/auth/[...nextauth]/route.ts` | Auth.js API route handler |
| Create | `app/api/auth/register/route.ts` | User registration endpoint |
| Modify | `package.json` | Remove Clerk deps, add Auth.js + bcryptjs |
| Modify | `.env` | Remove Clerk vars, add AUTH_SECRET |
| Modify | `middleware.ts` | Rewrite to use Auth.js session |
| Modify | `app/layout.tsx` | Remove ClerkProvider, add SessionProvider |
| Modify | `app/page.tsx` | Remove Clerk SignUp, create custom sign-up form |
| Modify | `app/sign-in/[[...sign-in]]/page.tsx` | Remove Clerk, use Auth.js signIn |
| Modify | `app/sign-up/[[...sign-up]]/page.tsx` | Remove Clerk, create custom sign-up form |
| Modify | `db/schema.sql` | Add password_hash column, remove clerk_id |
| Delete | `app/sso-callback/page.tsx` | No OAuth |
| Delete | `app/api/webhooks/clerk/route.ts` | No webhooks |
| Delete | `app/api/webhooks/` directory | Empty after route deletion |

---

### Task 1: Install dependencies and update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Clerk and add Auth.js dependencies**

```bash
npm uninstall @clerk/nextjs svix
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Verify package.json changes**

Run: `cat package.json`
Expected: `@clerk/nextjs` and `svix` removed, `next-auth` and `bcryptjs` added

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: replace Clerk with Auth.js v5 + bcryptjs"
```

---

### Task 2: Update environment variables

**Files:**
- Modify: `.env`

- [ ] **Step 1: Update .env**

Remove:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
```

Add:
```
AUTH_SECRET=<generate with: openssl rand -base64 32>
```

- [ ] **Step 2: Generate AUTH_SECRET and add to .env**

```bash
openssl rand -base64 32
```
Add the output as `AUTH_SECRET=...` in `.env`

- [ ] **Step 3: Commit**

```bash
git add .env
git commit -m "chore: replace Clerk env vars with AUTH_SECRET"
```

---

### Task 3: Update database schema

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add password_hash column and remove clerk_id**

In `db/schema.sql`, replace the user table definition:

```sql
CREATE TABLE "user" (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    image_url    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Remove the `idx_user_clerk_id` index line.

- [ ] **Step 2: Run migration on existing database**

```bash
psql "$DATABASE_URL" -c 'ALTER TABLE "user" DROP COLUMN IF EXISTS clerk_id;'
psql "$DATABASE_URL" -c 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash TEXT;'
psql "$DATABASE_URL" -c 'UPDATE "user" SET password_hash = \'$2b$10$placeholder\' WHERE password_hash IS NULL;'
psql "$DATABASE_URL" -c 'ALTER TABLE "user" ALTER COLUMN password_hash SET NOT NULL;'
psql "$DATABASE_URL" -c 'DROP INDEX IF EXISTS idx_user_clerk_id;'
```

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "db: replace clerk_id with password_hash in user table"
```

---

### Task 4: Create Auth.js configuration

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create auth.ts configuration**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { query } from "./db"

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  image_url: string | null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const { rows } = await query<UserRow>(
          'SELECT id, name, email, password_hash, image_url FROM "user" WHERE email = $1',
          [credentials.email]
        )

        const user = rows[0]
        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image_url,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

- [ ] **Step 2: Create API route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts app/api/auth/
git commit -m "feat: add Auth.js configuration with Credentials provider"
```

---

### Task 5: Create registration endpoint

**Files:**
- Create: `app/api/auth/register/route.ts`

- [ ] **Step 1: Create register route**

```typescript
import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/db"

interface UserRow {
  id: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const { rows: existing } = await query<UserRow>(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    )

    if (existing.length > 0) {
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { rows } = await query<UserRow>(
      'INSERT INTO "user" (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, passwordHash]
    )

    return Response.json(
      { userId: rows[0].id, message: "Account created" },
      { status: 201 }
    )
  } catch (err) {
    console.error("Registration error:", err)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat: add user registration endpoint"
```

---

### Task 6: Update middleware for Auth.js

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Rewrite middleware**

```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/", "/sign-in", "/sign-up"]

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.url)
    signInUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: rewrite middleware for Auth.js session protection"
```

---

### Task 7: Update root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace ClerkProvider with SessionProvider**

```typescript
import type { Metadata } from "next";
import { Bricolage_Grotesque, Quicksand } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const quicksand = Quicksand({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kyuutai — Fandom Devotion Platform",
  description: "Your fandom, quantified. Journal, timeline, weekly recaps, and passion radar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolageGrotesque.variable} ${quicksand.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-background font-[family-name:var(--font-body)]">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: replace ClerkProvider with Auth.js SessionProvider"
```

---

### Task 8: Rewrite sign-in page

**Files:**
- Modify: `app/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Rewrite sign-in page with Auth.js**

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/devotion-log"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F4F4F5]">
              Welcome back
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Sign in to continue your fandom devotion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-[#F87171]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold text-base hover:bg-[#b91c1c] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#A1A1AA]">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-[#E6192E] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/sign-in/[[...sign-in]]/page.tsx"
git commit -m "feat: rewrite sign-in page with Auth.js Credentials provider"
```

---

### Task 9: Rewrite sign-up page

**Files:**
- Modify: `app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Rewrite sign-up page**

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
        return
      }

      router.push("/sign-in?registered=true")
    } catch {
      setError("Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F4F4F5]">
              Create account
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Start your fandom devotion journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-[#F87171]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold text-base hover:bg-[#b91c1c] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#A1A1AA]">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#E6192E] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/sign-up/[[...sign-up]]/page.tsx"
git commit -m "feat: rewrite sign-up page with custom form"
```

---

### Task 10: Rewrite landing page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite landing page**

```typescript
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/devotion-log")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <SplitAuthLayout>
        <RightAuthPanel>
          <div className="flex items-center justify-center h-64">
            <p className="text-[#A1A1AA]">Loading...</p>
          </div>
        </RightAuthPanel>
      </SplitAuthLayout>
    )
  }

  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F4F4F5]">
              Welcome to Kyuutai
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Your fandom, quantified
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/sign-up"
              className="w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold text-base hover:bg-[#b91c1c] active:scale-[0.98] transition-all text-center"
            >
              Get Started
            </Link>

            <Link
              href="/sign-in"
              className="w-full py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] font-medium text-center hover:bg-[#3F3F46] transition-colors"
            >
              Sign In
            </Link>
          </div>

          <p className="text-center text-sm text-[#A1A1AA]">
            Journal your devotion. Track your timeline. Get weekly recaps.
          </p>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewrite landing page without Clerk"
```

---

### Task 11: Delete Clerk-specific files

**Files:**
- Delete: `app/sso-callback/page.tsx`
- Delete: `app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Delete files**

```bash
rm app/sso-callback/page.tsx
rm app/api/webhooks/clerk/route.ts
rmdir app/api/webhooks 2>/dev/null || true
rmdir app/sso-callback 2>/dev/null || true
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove Clerk webhook and SSO callback files"
```

---

### Task 12: Update API routes to use Auth.js

**Files:**
- Modify: `lib/auth.ts` (already done in Task 4)
- Modify: `app/api/devotion-log/journal/route.ts`
- Modify: `app/api/devotion-log/recap/route.ts`
- Modify: `app/api/passion-card/route.ts`

- [ ] **Step 1: Update getAuthUserId to use Auth.js**

The `getAuthUserId` function in `lib/auth.ts` needs to be updated. Add this export:

```typescript
export async function getAuthUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user.id
}
```

- [ ] **Step 2: Verify API routes still work**

The existing API routes already import `getAuthUserId` from `@/lib/auth`, so they should work without changes.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: update getAuthUserId to use Auth.js session"
```

---

### Task 13: Run TypeScript check and lint

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 2: Run linter**

```bash
npm run lint
```
Expected: No errors (warnings OK)

- [ ] **Step 3: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript and lint issues"
```

---

### Task 14: Test the complete flow

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test registration**

Navigate to `/sign-up`, create a new account, verify redirect to `/sign-in`

- [ ] **Step 3: Test sign-in**

Sign in with the new account, verify redirect to `/devotion-log`

- [ ] **Step 4: Test protected routes**

Navigate to `/devotion-log` while signed out, verify redirect to `/sign-in`

- [ ] **Step 5: Test sign-out**

Add a sign-out button (optional), verify session is cleared

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Clerk to Auth.js migration"
```

---

## Summary

**Total tasks:** 14
**Estimated time:** 2-3 hours

**Key changes:**
- Removed: `@clerk/nextjs`, `svix` packages
- Added: `next-auth@beta`, `bcryptjs` packages
- New files: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`
- Deleted files: `app/sso-callback/page.tsx`, `app/api/webhooks/clerk/route.ts`
- Modified: All auth-related pages, middleware, layout, database schema

**Security notes:**
- Passwords hashed with bcrypt (12 rounds)
- JWT sessions signed with AUTH_SECRET
- CSRF protection built into Auth.js
- No passwords stored in plain text
