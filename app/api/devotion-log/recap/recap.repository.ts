import pool from "@/lib/db"
import type { WeeklyRecap } from "@/types/recap"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): WeeklyRecap {
  return {
    id: row.id,
    userId: row.user_id,
    weekOf: row.week_of,
    scriptText: row.script_text,
    audioUrl: row.audio_url,
    sourceEntryIds: row.source_entry_ids ?? [],
    createdAt: row.created_at,
  }
}

export async function findRecapByWeek(
  userId: string,
  weekOf: string
): Promise<WeeklyRecap | null> {
  const result = await pool.query(
    "SELECT * FROM weekly_recaps WHERE user_id = $1 AND week_of = $2",
    [userId, weekOf]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function findAllRecaps(userId: string): Promise<WeeklyRecap[]> {
  const result = await pool.query(
    "SELECT * FROM weekly_recaps WHERE user_id = $1 ORDER BY week_of DESC",
    [userId]
  )
  return result.rows.map(mapRow)
}

export async function createRecap(recap: {
  userId: string
  weekOf: string
  scriptText: string
  audioUrl: string
  sourceEntryIds: string[]
}): Promise<WeeklyRecap> {
  const result = await pool.query(
    `INSERT INTO weekly_recaps (user_id, week_of, script_text, audio_url, source_entry_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [recap.userId, recap.weekOf, recap.scriptText, recap.audioUrl, recap.sourceEntryIds]
  )
  return mapRow(result.rows[0])
}
