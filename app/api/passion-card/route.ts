import { NextRequest } from "next/server"
import { generatePassionCard, getLatestPassionCard } from "./passion-card.service"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 })
  }

  const card = await getLatestPassionCard(userId)
  return Response.json({ data: card })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, games, anime, artists } = body

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    const card = await generatePassionCard({ userId, games, anime, artists })
    return Response.json({ data: card }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate passion card"
    const status = message.includes("at least one") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
