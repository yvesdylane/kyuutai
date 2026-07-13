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
