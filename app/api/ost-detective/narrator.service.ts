import pool from "@/lib/db"
import { getTrackById } from "./track.repository"
import { getRoundById } from "./game-round.service"
import { generateNarratorReaction } from "./gemini-client"
import { updateSessionScore, getSessionById } from "./game-session.repository"

export async function answerRound(
  roundId: string,
  userAnswerId: string
): Promise<{
  isCorrect: boolean
  narratorLine: string
  updatedStreak: number
  updatedScore: number
}> {
  const round = await getRoundById(roundId)
  if (!round) throw new Error("Round not found")
  if (round.status !== "ready") throw new Error("Round already answered")

  const isCorrect = round.correctId === userAnswerId
  const correctTrack = await getTrackById(round.correctId)
  const guessedTrack = await getTrackById(userAnswerId)
  if (!correctTrack || !guessedTrack) throw new Error("Track not found")

  let narratorLine = isCorrect ? "Nice one!" : "Not quite!"
  try {
    narratorLine = await generateNarratorReaction(
      isCorrect,
      { title: correctTrack.title, sourceName: correctTrack.sourceName, moodTags: correctTrack.moodTags },
      { title: guessedTrack.title, sourceName: guessedTrack.sourceName, moodTags: guessedTrack.moodTags }
    )
  } catch (e) {
    console.error("Narrator generation failed, using fallback:", e)
  }

  await pool.query(
    `UPDATE game_round
     SET user_answer_id = $1, is_correct = $2, narrator_line = $3, status = 'answered', answered_at = NOW()
     WHERE id = $4`,
    [userAnswerId, isCorrect, narratorLine, roundId]
  )

  let updatedStreak = 0
  let updatedScore = 0

  try {
    const session = await getSessionById(round.sessionId)
    if (!session) {
      console.error("[answerRound] Session not found:", round.sessionId)
    } else {
      updatedStreak = isCorrect ? session.streak + 1 : 0
      updatedScore = session.score + (isCorrect ? 100 * updatedStreak : 0)
      await updateSessionScore(round.sessionId, updatedScore, updatedStreak)
    }
  } catch (e) {
    console.error("[answerRound] Failed to update session score:", e)
  }

  return { isCorrect, narratorLine, updatedStreak, updatedScore }
}

export async function preGenerateNextRound(sessionId: string): Promise<void> {
  try {
    const { generateRound } = await import("./game-round.service")
    await generateRound(sessionId)
  } catch (error) {
    console.error("Pre-generation failed:", error)
  }
}
