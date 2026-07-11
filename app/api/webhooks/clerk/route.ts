import { NextRequest } from "next/server"
import { Webhook } from "svix"
import { query } from "@/lib/db"

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
    image_url?: string
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set")
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 })
  }

  const body = await request.text()

  const wh = new Webhook(webhookSecret)

  let event: ClerkWebhookEvent
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  const { type, data } = event

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const email = data.email_addresses?.[0]?.email_address || ""
        const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null

        await query(
          `INSERT INTO "user" (clerk_id, name, email, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (clerk_id)
           DO UPDATE SET name = $2, email = $3, image_url = $4, updated_at = NOW()`,
          [data.id, name, email, data.image_url || null]
        )
        break
      }
      case "user.deleted": {
        await query('DELETE FROM "user" WHERE clerk_id = $1', [data.id])
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error(`Error processing webhook event ${type}:`, err)
    return Response.json({ error: "Database error" }, { status: 500 })
  }

  return Response.json({ received: true })
}
