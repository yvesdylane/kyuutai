import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import * as journalService from "./journal.service"

export async function GET(request: NextRequest) {
  try {
    let userId: string
    try {
      userId = await getAuthUserId()
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
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
    let userId: string
    try {
      userId = await getAuthUserId()
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = await journalService.createJournalEntry({ ...body, userId })
    return Response.json({ data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const isValidation = message.includes("required") || message.includes("must be one of") || message.includes("cannot be empty")
    const status = isValidation ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
