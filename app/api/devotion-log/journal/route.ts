import { NextRequest } from "next/server"
import * as journalService from "./journal.service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 })
    }

    const startDate = searchParams.get("startDate") ?? undefined
    const endDate = searchParams.get("endDate") ?? undefined

    const data = await journalService.getJournalEntries(userId, {
      startDate,
      endDate,
    })
    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await journalService.createJournalEntry(body)
    return Response.json({ data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const isValidation = message.includes("required") || message.includes("must be one of") || message.includes("cannot be empty")
    const status = isValidation ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
