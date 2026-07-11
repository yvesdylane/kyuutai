import { auth } from "@clerk/nextjs/server"
import { query } from "./db"

export async function getAuthUserId(): Promise<string> {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new Error("Unauthorized")
  }

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM "user" WHERE clerk_id = $1',
    [clerkId]
  )

  if (!rows[0]) {
    throw new Error("User not found in database")
  }

  return rows[0].id
}
