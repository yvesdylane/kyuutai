import { randomUUID } from "crypto"
import pool from "@/lib/db"
import type {
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry,
} from "@/types/journal"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    mediaType: row.media_type,
    title: row.title,
    note: row.note,
    voiceTranscript: row.voice_transcript,
    mood: row.mood,
    createdAt: row.created_at,
  }
}

export async function findManyByUserId(
  userId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<JournalEntry[]> {
  let query = "SELECT * FROM journal_entries WHERE user_id = $1"
  const params: (string | Date)[] = [userId]

  if (filters?.startDate) {
    params.push(filters.startDate)
    query += ` AND date >= $${params.length}`
  }
  if (filters?.endDate) {
    params.push(filters.endDate)
    query += ` AND date <= $${params.length}`
  }

  query += " ORDER BY date DESC"

  const result = await pool.query(query, params)
  return result.rows.map(mapRow)
}

export async function findById(id: string): Promise<JournalEntry | null> {
  const result = await pool.query(
    "SELECT * FROM journal_entries WHERE id = $1",
    [id]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function create(data: CreateJournalEntry): Promise<JournalEntry> {
  const id = randomUUID()
  const result = await pool.query(
    `INSERT INTO journal_entries (id, user_id, date, media_type, title, note, voice_transcript, mood)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      data.userId,
      data.date ?? new Date(),
      data.mediaType,
      data.title,
      data.note ?? null,
      data.voiceTranscript ?? null,
      data.mood ?? null,
    ]
  )
  return mapRow(result.rows[0])
}

export async function update(
  id: string,
  data: UpdateJournalEntry
): Promise<JournalEntry | null> {
  const fields: string[] = []
  const values: (string | Date | null)[] = []
  let paramIndex = 1

  if (data.mediaType !== undefined) {
    fields.push(`media_type = $${paramIndex++}`)
    values.push(data.mediaType)
  }
  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`)
    values.push(data.title)
  }
  if (data.date !== undefined) {
    fields.push(`date = $${paramIndex++}`)
    values.push(data.date)
  }
  if (data.note !== undefined) {
    fields.push(`note = $${paramIndex++}`)
    values.push(data.note)
  }
  if (data.voiceTranscript !== undefined) {
    fields.push(`voice_transcript = $${paramIndex++}`)
    values.push(data.voiceTranscript)
  }
  if (data.mood !== undefined) {
    fields.push(`mood = $${paramIndex++}`)
    values.push(data.mood)
  }

  if (fields.length === 0) {
    return findById(id)
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE journal_entries SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function remove(id: string): Promise<JournalEntry | null> {
  const result = await pool.query(
    "DELETE FROM journal_entries WHERE id = $1 RETURNING *",
    [id]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}
