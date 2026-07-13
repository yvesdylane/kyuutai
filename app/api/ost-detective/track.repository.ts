import pool from "@/lib/db"
import type { track } from "@/types/ostDetective"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): track {
  return {
    id: row.id,
    title: row.title,
    sourceName: row.source_name,
    sourceType: row.source_type,
    clipUrl: row.clip_url,
    durationSec: row.duration_sec,
    moodTags: row.mood_tags,
    youtubeUrl: row.youtube_url,
    createdAt: row.created_at,
  }
}

export async function getRandomUnplayedTrack(sessionId: string): Promise<track | null> {
  const result = await pool.query(
    `SELECT t.* FROM track t
     WHERE t.id NOT IN (
       SELECT gr.track_id FROM game_round gr WHERE gr.session_id = $1
     )
     ORDER BY RANDOM()
     LIMIT 1`,
    [sessionId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getMoodDistractors(
  trackId: string,
  excludeIds: string[],
  count: number = 3
): Promise<track[]> {
  const result = await pool.query(
    `SELECT t.* FROM track t
     WHERE t.id != $1
       AND t.id != ALL($2)
       AND t.mood_tags ?| (
         SELECT ARRAY(
           SELECT jsonb_array_elements_text(mood_tags) FROM track WHERE id = $1
         )
       )
     ORDER BY RANDOM()
     LIMIT $3`,
    [trackId, excludeIds, count]
  )
  return result.rows.map(mapRow)
}

export async function getTrackById(id: string): Promise<track | null> {
  const result = await pool.query("SELECT * FROM track WHERE id = $1", [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}
