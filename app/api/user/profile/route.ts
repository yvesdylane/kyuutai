import { NextRequest } from "next/server"
import { getAuthUserId } from "@/lib/auth"
import pool from "@/lib/db"
import { uploadProfileImage } from "@/lib/cloudinary"

export async function GET() {
  try {
    const userId = await getAuthUserId()

    const result = await pool.query(
      'SELECT id, name, email, image_url, created_at, updated_at FROM "user" WHERE id = $1',
      [userId]
    )

    const user = result.rows[0]
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.image_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      { error: message },
      { status: message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const formData = await request.formData()

    const name = formData.get("name") as string | null
    const email = formData.get("email") as string | null
    const imageFile = formData.get("image") as File | null

    let imageUrl: string | null = null

    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadProfileImage(imageFile, userId)
    }

    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (name !== null) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }

    if (email !== null) {
      updates.push(`email = $${paramIndex}`)
      values.push(email)
      paramIndex++
    }

    if (imageUrl !== null) {
      updates.push(`image_url = $${paramIndex}`)
      values.push(imageUrl)
      paramIndex++
    }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(userId)

    const result = await pool.query(
      `UPDATE "user" SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, email, image_url, created_at, updated_at`,
      values
    )

    const user = result.rows[0]
    return Response.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.image_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message.includes("unique")) {
      return Response.json(
        { error: "Email already in use" },
        { status: 409 }
      )
    }
    return Response.json(
      { error: message },
      { status: message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
