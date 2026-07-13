import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { getAuthUserId } from "@/lib/auth"
import pool from "@/lib/db"

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM "user" WHERE id = $1',
      [userId]
    )

    const user = userResult.rows[0]
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const passwordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    )
    if (!passwordValid) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await pool.query(
      'UPDATE "user" SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    )

    return Response.json({ data: { success: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      { error: message },
      { status: message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
