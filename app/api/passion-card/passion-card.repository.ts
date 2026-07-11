import pool from "@/lib/db"
import type { PassionCard } from "@/types/passion-card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PassionCard {
  return {
    id: row.id,
    userId: row.user_id,
    games: row.games ?? [],
    anime: row.anime ?? [],
    artists: row.artists ?? [],
    radarAxes: row.radar_axes ?? [],
    archetype: row.archetype,
    blurb: row.blurb,
    audioUrl: row.audio_url,
    obsessionId: row.obsession_id,
    recommendations: row.recommendations ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findLatestByUserId(
  userId: string
): Promise<PassionCard | null> {
  const result = await pool.query(
    "SELECT * FROM passion_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function findById(id: string): Promise<PassionCard | null> {
  const result = await pool.query(
    "SELECT * FROM passion_cards WHERE id = $1",
    [id]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function create(data: {
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
  radarAxes: { axis: string; score: number }[]
  archetype: string
  blurb: string
  audioUrl: string | null
  obsessionId: string | null
  recommendations: { title: string; category: string; reason: string }[]
}): Promise<PassionCard> {
  const result = await pool.query(
    `INSERT INTO passion_cards (user_id, games, anime, artists, radar_axes, archetype, blurb, audio_url, obsession_id, recommendations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.userId,
      data.games,
      data.anime,
      data.artists,
      JSON.stringify(data.radarAxes),
      data.archetype,
      data.blurb,
      data.audioUrl,
      data.obsessionId,
      JSON.stringify(data.recommendations),
    ]
  )
  return mapRow(result.rows[0])
}
