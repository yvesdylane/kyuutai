# Fandom Devotion Platform — Project Structure

**Core concept:** One platform, one shared backbone (auth, user profile, AI layer, voice layer), four modules that share infrastructure instead of competing for weekend hours. "Devotion Log" is the **anchor MVP** (finish this first, no matter what). The other three ideas become **modules** bolted onto the same data model, so if you have time left, you add a module — you never start over.

```
Anchor (must ship):     Devotion Log (journal → timeline → weekly recap)
Module A (if time):     Passion Card (5 games + 5 anime + artists → AI profile)
Module B (if time):     OST Detective / Blind Test (mini-game, leaderboard)
Module C (stretch):     Karaoke Judge (record → AI roast → sensei voice)
```

Why this order: Devotion Log alone already stacks both prize tracks (Google AI + ElevenLabs) and is "two API calls wrapped in a journal" — lowest risk, highest emotional payoff. Everything else is additive, not required.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast dev loop, everyone on the team knows it |
| Styling | Tailwind CSS | No time to hand-roll CSS this weekend |
| State | Zustand (or React Context if team is small) | Lightweight, no boilerplate |
| Backend | **NestJS** (TypeScript) | Modular structure (modules/controllers/services/providers) maps 1:1 onto your 4 feature modules — keeps a hackathon codebase from turning into spaghetti |
| ORM | **Prisma** (recommended) or TypeORM | Prisma + Nest is the fastest path to migrations + typed queries for a weekend; TypeORM is the more "native" Nest choice if your team already knows it |
| DB | **PostgreSQL** | Hosted free tier via Supabase, Railway, or Neon — pick whichever gives you a connection string fastest |
| Auth | Nest `@nestjs/passport` + JWT, or a stubbed single-user session for demo | Don't over-engineer auth for a weekend judge demo |
| Storage (audio files) | Supabase Storage / S3 bucket / local `/uploads` served via a Nest static module | Recap audio + karaoke recordings need somewhere to live |
| Speech-to-text (voice journal input) | **Web Speech API** (browser-native) | ElevenLabs is TTS-only — do not burn time looking for ElevenLabs STT |
| Text-to-speech (narrator, recap, sensei) | **ElevenLabs TTS** (+ Voice Design/cloning for "sensei" persona) | |
| AI reasoning/generation | **Google AI (Gemini API)** | Pattern-finding, recap script writing, trivia generation, roast generation |
| Deployment | Vercel (frontend) + Railway/Render (NestJS backend, since Nest wants a long-lived process, not a one-off serverless function) | Keep infra to one click-deploy each |

---

## 2. Monorepo Folder Structure

```
fandom-devotion/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── devotion-log/     # ANCHOR MODULE
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── JournalEntryForm.tsx
│   │   │   │   │   │   ├── VoiceRecorder.tsx        # Web Speech API wrapper
│   │   │   │   │   │   ├── PassionTimeline.tsx      # scrapbook feed
│   │   │   │   │   │   ├── TimelineCard.tsx          # game/anime/song card
│   │   │   │   │   │   └── WeeklyRecapPlayer.tsx     # ElevenLabs audio player
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useVoiceInput.ts
│   │   │   │   │   │   └── useWeeklyRecap.ts
│   │   │   │   │   └── pages/
│   │   │   │   │       ├── JournalPage.tsx
│   │   │   │   │       └── TimelinePage.tsx
│   │   │   │   ├── passion-card/     # MODULE A
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── FavoritesInputWizard.tsx  # 5 games/5 anime/artists
│   │   │   │   │   │   ├── PersonalityProfile.tsx
│   │   │   │   │   │   └── ShareableCard.tsx         # canvas/svg export
│   │   │   │   │   └── pages/PassionCardPage.tsx
│   │   │   │   ├── ost-detective/    # MODULE B
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ClipPlayer.tsx
│   │   │   │   │   │   ├── GuessInput.tsx
│   │   │   │   │   │   ├── Leaderboard.tsx
│   │   │   │   │   │   └── StreakBadge.tsx
│   │   │   │   │   └── pages/OstDetectivePage.tsx
│   │   │   │   └── karaoke-judge/    # MODULE C
│   │   │   │       ├── components/
│   │   │   │       │   ├── KaraokeRecorder.tsx
│   │   │   │       │   ├── SenseiVerdict.tsx
│   │   │   │       │   └── ScoreMeter.tsx
│   │   │   │       └── pages/KaraokeJudgePage.tsx
│   │   │   ├── shared/
│   │   │   │   ├── components/       # Button, Modal, Card, AudioPlayer, Nav
│   │   │   │   ├── api/              # typed fetch wrappers to backend routes
│   │   │   │   │   ├── aiClient.ts        # calls backend /api/ai/*
│   │   │   │   │   ├── voiceClient.ts     # calls backend /api/voice/*
│   │   │   │   │   └── dataClient.ts      # journal/timeline CRUD
│   │   │   │   ├── hooks/useAuth.ts
│   │   │   │   └── types/                 # shared TS types (mirrors backend/shared)
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Backend — NestJS
│       ├── src/
│       │   ├── app.module.ts                    # root module, imports everything below
│       │   ├── main.ts                           # Nest bootstrap
│       │   │
│       │   ├── prisma/                           # shared DB access module
│       │   │   ├── prisma.module.ts
│       │   │   └── prisma.service.ts             # injectable PrismaClient wrapper
│       │   │
│       │   ├── ai/                               # shared Google AI (Gemini) module
│       │   │   ├── ai.module.ts
│       │   │   └── ai.service.ts                 # single Gemini client, injected everywhere
│       │   │
│       │   ├── voice/                            # shared ElevenLabs module
│       │   │   ├── voice.module.ts
│       │   │   └── voice.service.ts              # TTS + voice cloning, injected everywhere
│       │   │
│       │   ├── auth/                             # @nestjs/passport + JWT (or stub)
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   └── guards/jwt-auth.guard.ts
│       │   │
│       │   ├── users/
│       │   │   ├── users.module.ts
│       │   │   ├── users.controller.ts
│       │   │   └── users.service.ts
│       │   │
│       │   ├── devotion-log/                     # ANCHOR MODULE
│       │   │   ├── devotion-log.module.ts
│       │   │   ├── journal.controller.ts         # CRUD journal entries
│       │   │   ├── journal.service.ts
│       │   │   ├── timeline.controller.ts        # GET aggregated timeline
│       │   │   ├── timeline.service.ts            # groups entries into scrapbook view
│       │   │   ├── recap.controller.ts           # POST generate weekly recap
│       │   │   ├── recap.service.ts              # calls AiService -> script, VoiceService -> audio
│       │   │   └── dto/
│       │   │       ├── create-journal-entry.dto.ts
│       │   │       └── generate-recap.dto.ts
│       │   │
│       │   ├── passion-card/                     # MODULE A
│       │   │   ├── passion-card.module.ts
│       │   │   ├── passion-card.controller.ts    # POST generate profile+card
│       │   │   ├── passion-card.service.ts
│       │   │   └── dto/create-passion-card.dto.ts
│       │   │
│       │   ├── ost-detective/                    # MODULE B
│       │   │   ├── ost-detective.module.ts
│       │   │   ├── ost-detective.controller.ts   # GET clip+options, POST guess
│       │   │   ├── ost-detective.service.ts
│       │   │   ├── mood-clustering.service.ts    # "same feeling" logic via AiService
│       │   │   └── dto/submit-guess.dto.ts
│       │   │
│       │   └── karaoke-judge/                    # MODULE C
│       │       ├── karaoke-judge.module.ts
│       │       ├── karaoke.controller.ts         # POST audio -> score+roast
│       │       ├── karaoke.service.ts
│       │       ├── karaoke-scoring.service.ts    # pitch/lyric-match + roast prompt
│       │       └── dto/submit-karaoke.dto.ts
│       │
│       ├── prisma/
│       │   ├── schema.prisma                     # single source of truth for DB models
│       │   └── migrations/
│       ├── seed/
│       │   ├── anime-openings.json               # 10–15 hardcoded OP clips + metadata
│       │   ├── mood-tags.json                    # emotional-cluster labels for Module B
│       │   └── seed.ts                           # prisma seed script
│       ├── test/                                 # Nest e2e test scaffold
│       ├── nest-cli.json
│       └── package.json
│
├── packages/
│   └── shared-types/                # types shared between web & api (monorepo win)
│       ├── journal.ts
│       ├── timeline.ts
│       └── ai.ts
│
├── .env.example                     # GOOGLE_AI_API_KEY, ELEVENLABS_API_KEY, DB_URL
├── package.json                     # workspaces: ["apps/*", "packages/*"]
└── README.md
```

---

## 3. Data Model — `prisma/schema.prisma` (PostgreSQL)

`TimelineItem` is intentionally left out — it's a derived/grouped view computed from `JournalEntry` in `timeline.service.ts`, not its own table.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum MediaType {
  GAME
  ANIME
  SONG
}

model User {
  id            String          @id @default(cuid())
  name          String
  email         String          @unique
  createdAt     DateTime        @default(now())

  journalEntries JournalEntry[]
  weeklyRecaps   WeeklyRecap[]
  passionCards   PassionCard[]
  gameSessions   GameSession[]
  karaokeAttempts KaraokeAttempt[]
}

model JournalEntry {                 // Devotion Log
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id])
  date             DateTime  @default(now())
  mediaType        MediaType
  title            String
  note             String?
  voiceTranscript  String?
  mood             String?
  createdAt        DateTime  @default(now())

  @@index([userId, date])
}

model WeeklyRecap {                  // Devotion Log
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id])
  weekOf         DateTime
  scriptText     String              // Gemini output
  audioUrl       String              // ElevenLabs output
  sourceEntryIds String[]

  @@index([userId, weekOf])
}

model PassionCard {                  // Module A
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])
  games               String[] // 5 entries
  anime               String[] // 5 entries
  artists             String[]
  aiProfileText       String
  recommendations     String[]
  cardImageUrl        String?
  createdAt           DateTime @default(now())
}

model GameSession {                  // Module B — OST Detective
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  score        Int      @default(0)
  streak       Int      @default(0)
  mode         String   // e.g. "classic" | "mood-cluster"
  clipsPlayed  Json     // array of {clipId, guess, correct}
  createdAt    DateTime @default(now())
}

model KaraokeAttempt {               // Module C
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  audioUrl     String
  targetSong   String
  aiScore      Int
  roastText    String
  roastAudioUrl String
  createdAt    DateTime @default(now())
}
```

---

## 4. API Integration Map

**`AiModule` / `AiService`** (`ai/ai.service.ts`) — one injectable Nest provider, imported by every feature module that needs it:
- Devotion Log (`recap.service.ts`): turn a week of journal entries into an "anime-narrator style" recap script
- Passion Card (`passion-card.service.ts`): pattern-match 5 games + 5 anime + artists → personality profile + recs
- OST Detective (`mood-clustering.service.ts`): generate mood-clustering + infinite trivia question variants
- Karaoke Judge (`karaoke-scoring.service.ts`): generate the "strict sensei" roast/critique text from a lyric/pitch score

**`VoiceModule` / `VoiceService`** (`voice/voice.service.ts`) — one injectable Nest provider, imported by every feature module that needs it:
- Devotion Log: TTS the weekly recap script in an "anime narrator" voice
- OST Detective: TTS a game-show-host narrator line per round
- Karaoke Judge: Voice Design/cloning for a consistent "strict sensei" persona reading the roast

Since both are Nest `@Injectable()` providers exported from their own modules, any feature module just adds `AiModule`/`VoiceModule` to its `imports: []` and injects the service in its constructor — no re-instantiating API clients per feature.

**Web Speech API** (browser, no external key) — voice **input** for the journal, since ElevenLabs only does output. This is the one substitution from your original notes — flag it to the team early so nobody burns an hour hunting for "ElevenLabs STT."

---

## 5. Weekend Build Order (suggested)

| Block | Task |
|---|---|
| Sat AM | `nest new apps/api`, `prisma init`, point `DATABASE_URL` at a hosted Postgres, `prisma migrate dev`, scaffold `devotion-log` module (`nest g module/controller/service devotion-log`), auth stub, journal CRUD (text-only, no AI yet) |
| Sat PM | Web Speech API voice input → journal entry; Passion Timeline UI (scrapbook feed) |
| Sat Night | Gemini wrapper + recap script generation; ElevenLabs wrapper + TTS playback |
| Sun AM | Polish Devotion Log end-to-end (this is your demoable MVP — protect this) |
| Sun Midday | **If ahead of schedule:** build Passion Card (reuses Gemini wrapper directly) |
| Sun Afternoon | **If still ahead:** OST Detective with hardcoded 10–15 clip seed set |
| Sun Evening | Cut anything unfinished, demo script, deploy, README |

Karaoke Judge is marked stretch/cut-first — it needs audio scoring (pitch/lyric match) which is the highest-effort, highest-risk piece relative to its "silly demo" payoff.

---

## 6. What NOT to build this weekend
- Don't build a real music licensing/streaming pipeline — hardcode a JSON seed of 10–15 clips with public/fair-use snippets or short embedded clips cut to timestamp.
- Don't build full auth/social features — a single-user local demo account is enough for judges.
- Don't try to find "ElevenLabs speech-to-text" — it doesn't exist as a product; Web Speech API replaces it.
- Don't build all 4 modules "equally" — Devotion Log finished and polished beats four modules half-built.
- Don't hand-roll SQL — let `prisma migrate dev` generate migrations from `schema.prisma`; hand-editing SQL against Postgres is time you don't have.
- Don't create a new PrismaClient/Gemini/ElevenLabs instance per module — inject the shared `PrismaService`/`AiService`/`VoiceService` everywhere via Nest's DI, or you'll hit rate limits and connection-pool exhaustion on Postgres.
