import { GoogleGenerativeAI } from "@google/generative-ai"

function getGenAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables")
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function generateRecapScript(entries: {
  title: string
  mediaType: string
  note: string | null
  mood: string | null
  date: string
}[]): Promise<string> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

  const entriesText = entries
    .map(
      (e) =>
        `- ${e.date}: [${e.mediaType}] "${e.title}"${e.note ? ` — ${e.note}` : ""}${e.mood ? ` (mood: ${e.mood})` : ""}`
    )
    .join("\n")

  const prompt = `You are an enthusiastic anime narrator. Write a 30-second recap of this week's fandom devotion.
Be dramatic, warm, and reference specific titles. Format as spoken narration.
Keep it under 80 words. Use short, punchy sentences. Use "..." for natural pauses.
Write like someone talking, not like someone reading an essay. No bullet points or lists.

Here are this week's journal entries:
${entriesText}

Write the recap narration:`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function generatePassionProfile(favorites: {
  games: string[]
  anime: string[]
  artists: string[]
}): Promise<{
  axes: { axis: string; score: number }[]
  archetype: string
  blurb: string
  recommendations: { title: string; category: string; reason: string }[]
}> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

  const prompt = `Analyze these favorites and produce a passion profile with personalized recommendations.

Games: ${favorites.games.join(", ") || "(none provided)"}
Anime: ${favorites.anime.join(", ") || "(none provided)"}
Artists: ${favorites.artists.join(", ") || "(none provided)"}

Return ONLY valid JSON:
{
  "axes": [
    {"axis": "emotion name", "score": 0-100}
  ],
  "archetype": "The [Adjective] [Noun]",
  "blurb": "2-3 sentence personality description, spoken-word style, referencing specific titles from the lists",
  "recommendations": [
    {"title": "Name", "category": "game|anime|artist|song", "reason": "One sentence why they'd love this"}
  ]
}

Rules:
- Axes must be exactly 6, emotionally meaningful, specific to these favorites
- Scores reflect intensity (0=none, 100=dominant trait)
- Archetype should feel like a character class or anime title
- Blurb should feel like a narrator describing someone's soul
- Keep blurb under 60 words
- Reference at least 2 specific titles in the blurb
- Provide exactly 5 recommendations across mixed categories (games, anime, artists, songs)
- Recommendations should feel like they come from someone who truly understands the person's taste
- Each recommendation reason should reference something specific from their favorites
- Return ONLY the JSON object, no markdown, no explanation`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON")
  }

  return JSON.parse(jsonMatch[0])
}
