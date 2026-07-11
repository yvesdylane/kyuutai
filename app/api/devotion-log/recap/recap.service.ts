import { findRecapByWeek, createRecap } from "./recap.repository"
import { findManyByUserId } from "../journal/journal.repository"
import { generateRecapScript } from "@/lib/gemini"
import { textToSpeech } from "@/lib/elevenlabs"

function getWeekOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().split("T")[0]
}

export async function generateRecap(userId: string) {
  const now = new Date()
  const weekOf = getWeekOf(now)

  // Check for cached recap
  const existing = await findRecapByWeek(userId, weekOf)
  if (existing) {
    return existing
  }

  // Get entries from past 7 days
  const allEntries = await findManyByUserId(userId)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const weekEntries = allEntries.filter(
    (e) => new Date(e.date) >= sevenDaysAgo
  )

  if (weekEntries.length === 0) {
    throw new Error("No entries this week")
  }

  // Generate script with Gemini
  const scriptText = await generateRecapScript(
    weekEntries.map((e) => ({
      title: e.title,
      mediaType: e.mediaType,
      note: e.note,
      mood: e.mood,
      date: String(e.date),
    }))
  )

  // Generate audio with ElevenLabs
  const audioUrl = await textToSpeech(scriptText)

  // Save to database
  const recap = await createRecap({
    userId,
    weekOf,
    scriptText,
    audioUrl,
    sourceEntryIds: weekEntries.map((e) => e.id),
  })

  return recap
}

export async function listRecaps(userId: string) {
  const { findAllRecaps } = await import("./recap.repository")
  return findAllRecaps(userId)
}
