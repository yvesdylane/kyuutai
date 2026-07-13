import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { getRoundById } from "@/app/api/ost-detective/game-round.service"
import { answerRound, preGenerateNextRound } from "@/app/api/ost-detective/narrator.service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    await getAuthUserId()
    const { roundId } = await params
    const { user_answer_id } = await request.json()

    if (!user_answer_id) {
      return Response.json({ error: "Answer is required" }, { status: 400 })
    }

    const round = await getRoundById(roundId)
    if (!round) {
      return Response.json({ error: "Round not found" }, { status: 404 })
    }

    const result = await answerRound(roundId, user_answer_id)

    preGenerateNextRound(round.sessionId).catch(console.error)

    return Response.json({ data: result })
  } catch (error) {
    console.error("[answer-round] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: message.includes("Unauthorized") ? 401 : 500 })
  }
}
