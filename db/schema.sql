-- Fandom Devotion Platform — Database Schema
-- PostgreSQL

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE media_type AS ENUM ('GAME', 'ANIME', 'SONG');

-- ============================================================
-- User
-- ============================================================
CREATE TABLE "user" (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    clerk_id     TEXT UNIQUE,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    image_url    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_clerk_id ON "user" (clerk_id);

-- ============================================================
-- JournalEntry (Devotion Log — Anchor MVP)
-- ============================================================
CREATE TABLE journal_entry (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id           TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    date              TIMESTAMPTZ NOT NULL DEFAULT now(),
    media_type        media_type NOT NULL,
    title             TEXT NOT NULL,
    note              TEXT,
    voice_transcript  TEXT,
    mood              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entry_user_date ON journal_entry (user_id, date);

-- ============================================================
-- WeeklyRecap (Devotion Log)
-- ============================================================
CREATE TABLE weekly_recap (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    week_of          TIMESTAMPTZ NOT NULL,
    script_text      TEXT NOT NULL,
    audio_url        TEXT NOT NULL,
    source_entry_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_weekly_recap_user_week ON weekly_recap (user_id, week_of);

-- ============================================================
-- PassionCard (Module A)
-- ============================================================
CREATE TABLE passion_card (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    games              TEXT[] NOT NULL DEFAULT '{}',
    anime              TEXT[] NOT NULL DEFAULT '{}',
    artists            TEXT[] NOT NULL DEFAULT '{}',
    ai_profile_text    TEXT NOT NULL,
    recommendations    TEXT[] NOT NULL DEFAULT '{}',
    card_image_url     TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GameSession (Module B — OST Detective)
-- ============================================================
CREATE TABLE game_session (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    score         INT NOT NULL DEFAULT 0,
    streak        INT NOT NULL DEFAULT 0,
    mode          TEXT NOT NULL,
    clips_played  JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KaraokeAttempt (Module C)
-- ============================================================
CREATE TABLE karaoke_attempt (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    audio_url        TEXT NOT NULL,
    target_song      TEXT NOT NULL,
    ai_score         INT NOT NULL,
    roast_text       TEXT NOT NULL,
    roast_audio_url  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
