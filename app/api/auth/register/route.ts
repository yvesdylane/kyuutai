import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import pool from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    if (!username || !email || !password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await pool.query(
      'SELECT id FROM "user" WHERE email = $1 OR name = $2',
      [email, username]
    )
    if (existing.rows.length > 0) {
      return Response.json({ error: "User already exists" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      'INSERT INTO "user" (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [username, email, passwordHash]
    )

    return Response.json({ user: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
