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
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    image_url      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_email ON "user" (email);

-- ============================================================
-- JournalEntry (Devotion Log — Anchor MVP)
-- ============================================================
CREATE TABLE journal_entries (
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

CREATE INDEX idx_journal_entry_user_date ON journal_entries (user_id, date);

-- ============================================================
-- WeeklyRecap (Devotion Log)
-- ============================================================
CREATE TABLE weekly_recaps (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    week_of          TIMESTAMPTZ NOT NULL,
    script_text      TEXT NOT NULL,
    audio_url        TEXT NOT NULL,
    source_entry_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_recap_user_week ON weekly_recaps (user_id, week_of);

-- ============================================================
-- PassionCard (Module A)
-- ============================================================
CREATE TABLE passion_cards (
    id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    games              TEXT[] NOT NULL DEFAULT '{}',
    anime              TEXT[] NOT NULL DEFAULT '{}',
    artists            TEXT[] NOT NULL DEFAULT '{}',
    radar_axes         JSONB NOT NULL DEFAULT '[]'::JSONB,
    archetype          TEXT NOT NULL DEFAULT '',
    blurb              TEXT NOT NULL DEFAULT '',
    audio_url          TEXT,
    obsession_id       TEXT,
    recommendations    JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
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
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Track (Module B — OST Detective)
-- ============================================================
CREATE TABLE track (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title        TEXT NOT NULL,
    source_name  TEXT NOT NULL,
    source_type  media_type NOT NULL,
    clip_url     TEXT NOT NULL,
    duration_sec INT NOT NULL,
    mood_tags    JSONB NOT NULL DEFAULT '[]'::JSONB,
    youtube_url  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_track_mood_tags ON track USING GIN (mood_tags);

-- ============================================================
-- GameRound (Module B — OST Detective)
-- ============================================================
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
