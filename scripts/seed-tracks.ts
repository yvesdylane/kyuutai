import pg from "pg"
import { execSync } from "child_process"
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs"
import { uploadAudio } from "../lib/cloudinary"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const TRACKS_DIR = "public/audio/tracks"

const tracks = [
  { title: "Megalovania", sourceName: "Undertale", sourceType: "GAME", youtubeQuery: "Megalovania Undertale OST", durationSec: 30, moodTags: ["aggressive", "driving", "epic"] },
  { title: "Battle Theme", sourceName: "Pokemon Red/Blue", sourceType: "GAME", youtubeQuery: "Pokemon Red Blue battle theme OST", durationSec: 30, moodTags: ["tense", "driving", "upbeat"] },
  { title: "Great Fairy Fountain", sourceName: "The Legend of Zelda", sourceType: "GAME", youtubeQuery: "Great Fairy Fountain Zelda OST", durationSec: 30, moodTags: ["serene", "dreamy", "nostalgic"] },
  { title: "City of Tears", sourceName: "Hollow Knight", sourceType: "GAME", youtubeQuery: "Hollow Knight City of Tears", durationSec: 30, moodTags: ["melancholic", "serene", "mysterious"] },
  { title: "BFG Division", sourceName: "Doom Eternal", sourceType: "GAME", youtubeQuery: "BFG Division Doom Eternal OST", durationSec: 30, moodTags: ["aggressive", "epic", "driving"] },
  { title: "Simple and Clean", sourceName: "Kingdom Hearts", sourceType: "GAME", youtubeQuery: "Simple and Clean Kingdom Hearts", durationSec: 30, moodTags: ["nostalgic", "romantic", "upbeat"] },
  { title: "Gurenge", sourceName: "Demon Slayer", sourceType: "ANIME", youtubeQuery: "Gurenge Demon Slayer opening", durationSec: 30, moodTags: ["aggressive", "epic", "triumphant"] },
  { title: "Unravel", sourceName: "Tokyo Ghoul", sourceType: "ANIME", youtubeQuery: "Unravel Tokyo Ghoul opening", durationSec: 30, moodTags: ["melancholic", "epic", "mysterious"] },
  { title: "Kick Back", sourceName: "Chainsaw Man", sourceType: "ANIME", youtubeQuery: "Kick Back Chainsaw Man opening", durationSec: 30, moodTags: ["driving", "aggressive", "upbeat"] },
  { title: "The Rumbling", sourceName: "Attack on Titan", sourceType: "ANIME", youtubeQuery: "The Rumbling Attack on Titan", durationSec: 30, moodTags: ["epic", "aggressive", "tense"] },
  { title: "Blue Bird", sourceName: "Naruto Shippuden", sourceType: "ANIME", youtubeQuery: "Blue Bird Naruto Shippuden opening", durationSec: 30, moodTags: ["upbeat", "triumphant", "nostalgic"] },
  { title: "Kaikai Kitan", sourceName: "Jujutsu Kaisen", sourceType: "ANIME", youtubeQuery: "Kaikai Kitan Jujutsu Kaisen opening", durationSec: 30, moodTags: ["driving", "epic", "mysterious"] },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

async function downloadTrack(track: { title: string; sourceName: string; youtubeQuery: string }): Promise<string | null> {
  const slug = slugify(`${track.sourceName}-${track.title}`)

  console.log(`  Downloading: ${track.youtubeQuery}...`)

  try {
    // Download audio using yt-dlp
    const ytdlpCmd = `yt-dlp -x --audio-format mp3 --audio-quality 5 --no-playlist -o "${TRACKS_DIR}/temp-${slug}.%(ext)s" "ytsearch1:${track.youtubeQuery}"`
    execSync(ytdlpCmd, { stdio: "pipe", timeout: 60000 })

    // Find the downloaded file
    const tempFile = `${TRACKS_DIR}/temp-${slug}.mp3`
    if (!existsSync(tempFile)) {
      console.log(`  Failed to download: ${track.title}`)
      return null
    }

    // Trim to 30 seconds using ffmpeg
    const trimmedFile = `${TRACKS_DIR}/trimmed-${slug}.mp3`
    execSync(`ffmpeg -y -i "${tempFile}" -t 30 -acodec libmp3lame -q:a 5 "${trimmedFile}" 2>/dev/null`, { stdio: "pipe" })

    // Read into buffer and upload to Cloudinary
    const buffer = readFileSync(trimmedFile)
    const audioUrl = await uploadAudio(buffer, "tracks", `${slug}.mp3`)

    // Clean up local files
    unlinkSync(tempFile)
    unlinkSync(trimmedFile)

    console.log(`  Uploaded: ${slug}.mp3 -> Cloudinary`)
    return audioUrl
  } catch (error) {
    console.error(`  Error downloading ${track.title}:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function seed() {
  // Ensure directory exists for temp files
  if (!existsSync(TRACKS_DIR)) {
    mkdirSync(TRACKS_DIR, { recursive: true })
  }

  console.log("Seeding tracks with yt-dlp + Cloudinary...\n")

  // Clear existing data (cascade to handle foreign keys)
  await pool.query("DELETE FROM game_round")
  await pool.query("DELETE FROM track")
  console.log("Cleared existing tracks\n")

  for (const track of tracks) {
    console.log(`[${track.sourceType}] ${track.title} - ${track.sourceName}`)

    const clipUrl = await downloadTrack(track)

    if (clipUrl) {
      await pool.query(
        `INSERT INTO track (title, source_name, source_type, clip_url, duration_sec, mood_tags, youtube_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [track.title, track.sourceName, track.sourceType, clipUrl, track.durationSec, JSON.stringify(track.moodTags), `https://www.youtube.com/results?search_query=${encodeURIComponent(track.youtubeQuery)}`]
      )
    }

    console.log("")
  }

  const count = await pool.query("SELECT COUNT(*) FROM track")
  console.log(`Done! Seeded ${count.rows[0].count} tracks`)
  await pool.end()
}

seed().catch(console.error)
