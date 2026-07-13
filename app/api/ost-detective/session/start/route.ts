import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { createSession } from "@/app/api/ost-detective/game-session.repository"
import { generateRound } from "@/app/api/ost-detective/game-round.service"

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const { mode } = await request.json()

    if (!mode) {
      return Response.json({ error: "Mode is required" }, { status: 400 })
    }

    const session = await createSession(userId, mode)
    const round = await generateRound(session.id)

    return Response.json({ data: { sessionId: session.id, round } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
