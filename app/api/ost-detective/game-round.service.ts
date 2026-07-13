import pool from "@/lib/db"
import { getRandomUnplayedTrack, getMoodDistractors } from "./track.repository"
import { generateQuestion } from "./gemini-client"
import type { gameRound } from "@/types/ostDetective"

const ROUND_SELECT = `
  SELECT gr.*, t.clip_url
  FROM game_round gr
  JOIN track t ON t.id = gr.track_id
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): gameRound {
  return {
    id: row.id,
    sessionId: row.session_id,
    trackId: row.track_id,
    clipUrl: row.clip_url,
    questionText: row.question_text,
    options: row.options,
    correctId: row.correct_id,
    userAnswerId: row.user_answer_id,
    isCorrect: row.is_correct,
    narratorLine: row.narrator_line,
    narratorAudioUrl: row.narrator_audio_url,
    status: row.status,
    roundIndex: row.round_index,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
  }
}

export async function generateRound(sessionId: string): Promise<gameRound> {
  const track = await getRandomUnplayedTrack(sessionId)
  if (!track) throw new Error("No more tracks available")

  const excludeIds = [track.id]
  let distractors = await getMoodDistractors(track.id, excludeIds, 3)
  if (distractors.length < 3) {
    const fallback = await getRandomUnplayedTrack(sessionId)
    if (fallback && fallback.id !== track.id && !distractors.some(d => d.id === fallback.id)) {
      distractors = [...distractors, fallback]
    }
  }

  const rawOptions = [
    { id: track.id, title: track.title, sourceName: track.sourceName },
    ...distractors.map(d => ({ id: d.id, title: d.title, sourceName: d.sourceName })),
  ]
  for (let i = rawOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]]
  }
  const options = rawOptions

  let questionText = `Which track is this?`
  try {
    questionText = await generateQuestion(
      { title: track.title, sourceName: track.sourceName, moodTags: track.moodTags },
      distractors.map(d => ({ title: d.title, sourceName: d.sourceName, moodTags: d.moodTags }))
    )
  } catch (e) {
    console.error("Question generation failed, using fallback:", e)
  }

  const roundIndex = await getNextRoundIndex(sessionId)

  const result = await pool.query(
    `INSERT INTO game_round (session_id, track_id, question_text, options, correct_id, status, round_index)
     VALUES ($1, $2, $3, $4, $5, 'ready', $6)
     RETURNING *`,
    [sessionId, track.id, questionText, JSON.stringify(options), track.id, roundIndex]
  )

  return mapRow({ ...result.rows[0], clip_url: track.clipUrl })
}

export async function getRoundById(id: string): Promise<gameRound | null> {
  const result = await pool.query(
    `${ROUND_SELECT} WHERE gr.id = $1`,
    [id]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getNextReadyRound(sessionId: string): Promise<gameRound | null> {
  const result = await pool.query(
    `${ROUND_SELECT} WHERE gr.session_id = $1 AND gr.status = 'ready' ORDER BY gr.round_index ASC LIMIT 1`,
    [sessionId]
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getSessionRounds(sessionId: string): Promise<gameRound[]> {
  const result = await pool.query(
    `${ROUND_SELECT} WHERE gr.session_id = $1 ORDER BY gr.round_index ASC`,
    [sessionId]
  )
  return result.rows.map(mapRow)
}

async function getNextRoundIndex(sessionId: string): Promise<number> {
  const result = await pool.query(
    "SELECT COALESCE(MAX(round_index), 0) + 1 AS next_index FROM game_round WHERE session_id = $1",
    [sessionId]
  )
  return result.rows[0].next_index
}
