import { NextRequest } from "next/server"
import * as journalService from "../journal.service"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await journalService.getJournalEntry(id)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = await journalService.updateJournalEntry(id, body)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = message.includes("cannot be empty") ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await journalService.deleteJournalEntry(id)

    if (!data) {
      return Response.json({ error: "Journal entry not found" }, { status: 404 })
    }

    return Response.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
