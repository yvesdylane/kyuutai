import { findLatestByUserId, create } from "./passion-card.repository"
import { findManyByUserId } from "../devotion-log/journal/journal.repository"
import { generatePassionProfile } from "@/lib/gemini"
import { textToSpeech } from "@/lib/elevenlabs"
import type { GeneratePassionCardRequest } from "@/types/passion-card"

export async function generatePassionCard(req: GeneratePassionCardRequest) {
  const { userId, games, anime, artists } = req

  if (!games.length && !anime.length && !artists.length) {
    throw new Error("Please add at least one item to any category")
  }

  const profile = await generatePassionProfile({ games, anime, artists })

  const entries = await findManyByUserId(userId)
  const obsessionId = entries.length > 0 ? entries[0].id : null

  let audioUrl: string | null = null
  try {
    audioUrl = await textToSpeech(profile.blurb)
  } catch {
    // ElevenLabs failure is non-fatal
  }

  const card = await create({
    userId,
    games,
    anime,
    artists,
    radarAxes: profile.axes,
    archetype: profile.archetype,
    blurb: profile.blurb,
    audioUrl,
    obsessionId,
    recommendations: profile.recommendations ?? [],
  })

  return card
}

export async function getLatestPassionCard(userId: string) {
  return findLatestByUserId(userId)
}
