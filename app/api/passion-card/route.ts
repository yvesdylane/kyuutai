import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { generatePassionCard, getLatestPassionCard } from "./passion-card.service"

export async function GET(request: NextRequest) {
  let userId: string
  try {
    userId = await getAuthUserId()
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const card = await getLatestPassionCard(userId)
  return Response.json({ data: card })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let userId: string
    try {
      userId = await getAuthUserId()
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { games, anime, artists } = body

    const card = await generatePassionCard({ userId, games, anime, artists })
    return Response.json({ data: card }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate passion card"
    const status = message.includes("at least one") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
