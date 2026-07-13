import { ElevenLabsClient } from "elevenlabs"
import { uploadAudio } from "./cloudinary"

function getClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set in environment variables")
  }
  return new ElevenLabsClient({ apiKey })
}

export async function textToSpeech(text: string): Promise<string> {
  const client = getClient()
  const audio = await client.textToSpeech.convert("pNInz6obpgDQGcFmaJgB", {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.35,
      similarity_boost: 0.85,
      style: 0.1,
      use_speaker_boost: true,
    },
  })

  const chunks: Buffer[] = []
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk))
  }
  const buffer = Buffer.concat(chunks)

  const filename = `recap-${Date.now()}.mp3`
  return uploadAudio(buffer, "tts", filename)
}
