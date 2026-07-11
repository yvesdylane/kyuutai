import { NextRequest } from "next/server"
import { generateRecap, listRecaps } from "./recap.service"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 })
  }

  try {
    const recaps = await listRecaps(userId)
    return Response.json({ data: recaps })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch recaps" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    const recap = await generateRecap(userId)
    return Response.json({ data: recap }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate recap"
    const status = message === "No entries this week" ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
