import pool from "@/lib/db"
import type { gameSession } from "@/types/ostDetective"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): gameSession {
  return {
    id: row.id,
    userId: row.user_id,
    score: row.score,
    streak: row.streak,
    mode: row.mode,
    createdAt: row.created_at,
  }
}

export async function createSession(userId: string, mode: string): Promise<gameSession> {
  const result = await pool.query(
    "INSERT INTO game_session (user_id, mode) VALUES ($1, $2) RETURNING *",
    [userId, mode]
  )
  return mapRow(result.rows[0])
}

export async function getSessionById(id: string): Promise<gameSession | null> {
  const result = await pool.query("SELECT * FROM game_session WHERE id = $1", [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function updateSessionScore(
  id: string,
  score: number,
  streak: number
): Promise<void> {
  await pool.query(
    "UPDATE game_session SET score = $1, streak = $2 WHERE id = $3",
    [score, streak, id]
  )
}

export async function getLeaderboard(limit: number = 10): Promise<gameSession[]> {
  const result = await pool.query(
    "SELECT * FROM game_session ORDER BY score DESC, streak DESC LIMIT $1",
    [limit]
  )
  return result.rows.map(mapRow)
}
