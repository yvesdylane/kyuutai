import { getAuthUserId } from "@/lib/auth"
import { generateRecap, listRecaps } from "./recap.service"

export async function GET() {
  let userId: string
  try {
    userId = await getAuthUserId()
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
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

export async function POST() {
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
