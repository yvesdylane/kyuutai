# Cloudinary Audio Storage Migration

**Date:** 2026-07-13
**Status:** Approved

## Overview

Move all audio storage from local `public/audio/` to Cloudinary. Cloudinary is already configured for profile images — extend it to audio.

## Changes

### 1. `lib/cloudinary.ts` — add `uploadAudio()`

New exported function:
```typescript
export async function uploadAudio(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string>
```
- Uploads to Cloudinary with `resource_type: "audio"`, folder `kyuutai/{folder}`
- Returns `secure_url`
- Same lazy dynamic import pattern

### 2. `lib/elevenlabs.ts` — Cloudinary upload

Replace `fs.writeFile()` with `uploadAudio()`.
- Buffer → Cloudinary instead of disk
- Returns Cloudinary URL
- Remove `fs` and `path` imports

### 3. `scripts/seed-tracks.ts` — Cloudinary upload

After yt-dlp + ffmpeg:
- Read local MP3 into Buffer
- Upload via `uploadAudio(buffer, "tracks", slug)`
- Store Cloudinary URL in DB
- Delete local temp file

### 4. `app/api/ost-detective/elevenlabs-client.ts` — delete

Unused narrator TTS client.

## Files Modified

| File | Change |
|---|---|
| `lib/cloudinary.ts` | Add `uploadAudio()` |
| `lib/elevenlabs.ts` | Replace disk write with Cloudinary upload |
| `scripts/seed-tracks.ts` | Upload to Cloudinary after download |
| `app/api/ost-detective/elevenlabs-client.ts` | Delete |

## Not Changed

- DB schema (audio_url columns stay, just store full URLs now)
- Frontend playback (audio elements work with any URL)
- Profile image upload
