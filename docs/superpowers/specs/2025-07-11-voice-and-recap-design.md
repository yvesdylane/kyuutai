# Voice Input + Weekly Recap — Design Spec

**Date:** 2025-07-11
**Module:** Devotion Log
**Status:** Approved

---

## 1. Voice Dictation (Web Speech API)

### Overview
User taps mic button → browser listens → text appears in note textarea → tap to stop.

### Behavior
- Mic button on journal page triggers `SpeechRecognition`
- Recognized text appends to the "note" field in real-time
- Tap mic again to stop listening
- Visual feedback: button pulses red, shows "Listening..." label

### Technical
- API: `webkitSpeechRecognition` / `SpeechRecognition` (browser-native)
- Config: `continuous: true`, `interimResults: true`, `lang: "en-US"`
- No server-side code — pure client-side
- Store `voiceTranscript` on entry if voice was used

### Edge Cases
- Browser unsupported → hide mic button, show tooltip
- Mic permission denied → error toast
- Network lost → "Connection lost" message (Speech API requires internet)

---

## 2. Weekly Recap (Gemini + ElevenLabs)

### Flow
1. User opens Recap tab → list of past recaps (or empty state)
2. Tap "Generate Recap" → `POST /api/devotion-log/recap` with `{ userId }`
3. Backend:
   - Fetch entries from past 7 days
   - If recap exists for this week → return cached
   - If no entries → error "No entries this week"
   - Gemini: "Write a 30-second anime narrator recap of this week's fandom devotion"
   - ElevenLabs TTS: script → audio
   - Store in `weekly_recaps` table
   - Return recap
4. Frontend: recap card with script text, audio player, "Regenerate" button

### API Endpoints
- `POST /api/devotion-log/recap` — Generate or fetch cached
- `GET /api/devotion-log/recap?userId=user1` — List past recaps

### Database
```sql
CREATE TABLE weekly_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  week_of DATE NOT NULL,
  script_text TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  source_entry_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Gemini Prompt
```
You are an enthusiastic anime narrator. Write a 30-second recap of this week's fandom devotion.
Be dramatic, warm, and reference specific titles. Format as spoken narration.

Here are this week's journal entries:
{entries}
```

### ElevenLabs
- Use `eleven_multilingual_v2` model
- Voice: pick a narrator-style voice (e.g., "Adam" or "Antoni")
- Output: MP3 audio URL stored in recap record

---

## 3. Recap Page

### UI
- Header: "Weekly Recap"
- Generate button (primary CTA)
- Recap cards (newest first):
  - Week label ("Jul 7 – Jul 13")
  - Script text (collapsible)
  - Audio player (play/pause, progress bar)
  - Source entries count ("Based on 5 entries")

### Empty State
- Illustration or icon
- "No recaps yet"
- "Generate your first weekly recap"

### Loading State
- "Generating recap..." with progress animation
- Takes ~10-15 seconds (Gemini + ElevenLabs)

---

## 4. File Structure

```
app/api/devotion-log/recap/
  route.ts              # POST (generate), GET (list)
  recap.service.ts      # Gemini + ElevenLabs calls
  recap.repository.ts   # DB queries

app/devotion-log/recap/
  page.tsx              # Recap tab page

lib/
  gemini.ts             # Google AI client
  elevenlabs.ts         # ElevenLabs TTS client

types/
  recap.ts              # WeeklyRecap type
```
