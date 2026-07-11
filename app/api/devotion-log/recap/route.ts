import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import { generateRecap, listRecaps } from "./recap.service"

export async function GET(request: NextRequest) {
  let userId: string
  try {
    userId = await getAuthUserId()
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

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
    let userId: string
    try {
      userId = await getAuthUserId()
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recap = await generateRecap(userId)
    return Response.json({ data: recap }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate recap"
    const status = message === "No entries this week" ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
