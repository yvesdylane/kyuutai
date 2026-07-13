*This is a submission for [Weekend Challenge: Passion Edition](https://dev.to/challenges/weekend-2026-07-09)*

## What I Built

Kyuutai is a fandom devotion platform for people who want to track, reflect on, and celebrate the things they love most. Instead of treating fandom like a casual list of favorites, it turns it into an interactive experience built around three passions: gaming, anime, and music.

The project is organized around four connected experiences:

- Devotion Log — a journal for recording what I watched, played, or listened to, with mood tags, voice dictation, and a timeline view.
- Weekly Recap — an AI-generated narrated summary of the last 7 days of fandom activity, with audio playback.
- Passion Card — a personalized passion radar that analyzes top games, anime, and artists into an archetype profile, recommendations, and a downloadable visual card.
- OST Detective — a soundtrack guessing game built around real game and anime clips, with AI-written questions and narrator reactions.

Team submission:
- Dylane — anime
- Ace — gaming
- Kanjo — music

Add DEV profile links here when publishing: [Dylane](https://dev.to/), [Ace](https://dev.to/), [Kanjo](https://dev.to/)

The goal was to make fandom feel personal, expressive, and a little dramatic — like a living diary for obsession, taste, and identity.

## Demo

Live demo: add your deployed link here
Video demo: add your walkthrough link here

## Code

GitHub repository: https://github.com/yvesdylane/kyuutai

## How I Built It

Kyuutai is built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, PostgreSQL, NextAuth, Google Gemini, and ElevenLabs.

I kept the app organized with a clean App Router structure and a route -> service -> repository pattern so the HTTP layer, business logic, and SQL stay separated.

Google Gemini powers the intelligence layer. It generates weekly recap scripts, analyzes favorite media into a structured passion profile, and writes the short question/reaction text used in OST Detective. Each feature uses a different prompt style: recap narration is warm and dramatic, passion profiles return structured JSON, and OST Detective uses short game-show-style lines.

ElevenLabs handles the voice layer. It turns recap scripts and passion blurbs into audio files saved under public/audio/, which makes the app feel more like a fandom experience than a standard dashboard.

The Devotion Log also uses browser speech recognition for hands-free note-taking, while OST Detective pulls real soundtrack clips from YouTube using yt-dlp and trims them with ffmpeg for short blind-test rounds.

On the database side, the app uses raw SQL with parameterized queries, UUIDs, and a schema designed around journal entries, recap history, passion cards, and game sessions.

## Prize Categories

- Best Use of Google AI
- Best Use of ElevenLabs

<!-- Team Submissions: Please pick one member to publish the submission and credit teammates by listing their DEV usernames directly in the body of the post. -->

<!-- Thanks for participating! -->
