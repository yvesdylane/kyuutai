# yt-dlp Audio Integration for OST Detective

## Goal
Replace fictional track data with real game/anime OSTs using YouTube as the audio source. Seed script extracts 30s clips via yt-dlp and stores them locally.

## Changes

### 1. Database: Add `youtube_url` column
- `db/migrations/002_add_youtube_url.sql`: ALTER TABLE track ADD COLUMN youtube_url TEXT
- Update `db/schema.sql` to include the new column

### 2. Types: Add `youtubeUrl` field
- `types/ostDetective.ts`: Add `youtubeUrl?: string` to `track` interface

### 3. Seed script: Rewrite with real tracks + yt-dlp extraction
- `scripts/seed-tracks.ts`: Replace fictional tracks with 10-15 real OSTs
  - Each track has: title, sourceName, sourceType, youtubeUrl, moodTags
  - Script shells out to `yt-dlp` to extract 30s audio clip
  - Saves to `public/audio/tracks/<slug>.mp3`
  - Updates DB with local clip_url

### 4. Track repository: No changes needed
- Already uses `clip_url` from DB

### 5. Frontend: No changes needed
- Already plays from `clip_url`

## Real Track List

| Title | Source | Type | YouTube Search |
|---|---|---|---|
| Megalovania | Undertale | GAME | Megalovania Undertale OST |
| Battle Theme | Pokemon Red/Blue | GAME | Pokemon battle theme retro |
| Great Fairy Fountain | Zelda | GAME | Great Fairy Fountain Zelda |
| Drifting | Hollow Knight | GAME | Hollow Knight City of Tears |
| BFG Division | Doom Eternal | GAME | BFG Division Doom OST |
| Simple and Clean | Kingdom Hearts | GAME | Simple and Clean Kingdom Hearts |
| Gurenge | Demon Slayer | ANIME | Gurenge Demon Slayer opening |
| Unravel | Tokyo Ghoul | ANIME | Unravel Tokyo Ghoul opening |
| Kick Back | Chainsaw Man | ANIME | Kick Back Chainsaw Man opening |
| The Rumbling | Attack on Titan | ANIME | The Rumbling Attack on Titan |
| Blue Bird | Naruto Shippuden | ANIME | Blue Bird Naruto opening |
| Kaikai Kitan | Jujutsu Kaisen | ANIME | Kaikai Kitan Jujutsu Kaisen |

## yt-dlp Command
```bash
yt-dlp -x --audio-format mp3 --audio-quality 5 \
  --postprocessor-args "-t 30" \
  -o "public/audio/tracks/<slug>.mp3" \
  "ytsearch1:<query>"
```

Actually, yt-dlp doesn't have a built-in trim. Better approach:
```bash
yt-dlp -x --audio-format mp3 --audio-quality 5 \
  -o "public/audio/tracks/full/<slug>.mp3" \
  "https://www.youtube.com/watch?v=<video_id>"
```
Then use ffmpeg to trim to 30s and save to `public/audio/tracks/<slug>.mp3`.

## Prerequisites
- yt-dlp (already installed)
- ffmpeg (already installed, used for placeholder earlier)
