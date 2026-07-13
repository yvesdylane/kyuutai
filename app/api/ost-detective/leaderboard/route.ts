import { getLeaderboard } from "@/app/api/ost-detective/game-session.repository"

export async function GET() {
  try {
    const sessions = await getLeaderboard(10)
    return Response.json({ data: sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
