import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getSessionById } from "@/app/api/ost-detective/game-session.repository"
import { getSessionRounds } from "@/app/api/ost-detective/game-round.service"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await getAuthUserId()
    const { sessionId } = await params

    const session = await getSessionById(sessionId)
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    const rounds = await getSessionRounds(sessionId)

    return Response.json({ data: { session, rounds } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
