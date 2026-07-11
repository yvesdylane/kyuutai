import { NextRequest } from "next/server"
import { findById } from "../passion-card.repository"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const card = await findById(id)

  if (!card) {
    return Response.json({ error: "Passion card not found" }, { status: 404 })
  }

  return Response.json({ data: card })
}
