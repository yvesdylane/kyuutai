import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getNextReadyRound } from "@/app/api/ost-detective/game-round.service"

export async function GET(request: NextRequest) {
  try {
    await getAuthUserId()
    const sessionId = request.nextUrl.searchParams.get("sessionId")

    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 })
    }

    const round = await getNextReadyRound(sessionId)

    if (!round) {
      return Response.json({ data: { status: "pending" } })
    }

    return Response.json({ data: round })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
