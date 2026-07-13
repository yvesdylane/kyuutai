import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" })

const SYSTEM_PROMPT = `You are the narrator of "OST Detective," a fast-paced trivia game about game and anime soundtracks. Your persona is an energetic, slightly theatrical game-show host who is knowledgeable about music mood and emotional tone. Keep all responses short, punchy, and suited for text-to-speech playback (avoid emojis, avoid markdown, avoid stage directions).`

export async function generateQuestion(
  correctTrack: { title: string; sourceName: string; moodTags: string[] },
  distractors: { title: string; sourceName: string; moodTags: string[] }[]
): Promise<string> {
  const prompt = `Correct track: "${correctTrack.title}" from ${correctTrack.sourceName} (mood: ${correctTrack.moodTags.join(", ")})
Distractors: ${distractors.map(d => `"${d.title}" from ${d.sourceName} (mood: ${d.moodTags.join(", ")})`).join("; ")}
Task: Write ONE short quiz question stem (max 15 words) asking the player to identify the source of a music clip they just heard. Vary phrasing across calls — do not always say "which game is this from." Return plain text only, no preamble.`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: 100, temperature: 0.4 },
  })
  return result.response.text().trim()
}

export async function generateNarratorReaction(
  isCorrect: boolean,
  correctTrack: { title: string; sourceName: string; moodTags: string[] },
  guessedTrack: { title: string; sourceName: string; moodTags: string[] }
): Promise<string> {
  const sharedMoods = correctTrack.moodTags.filter(t => guessedTrack.moodTags.includes(t))
  const prompt = `Answer: ${isCorrect ? "CORRECT" : "INCORRECT"}
Correct track: "${correctTrack.title}" from ${correctTrack.sourceName} (mood: ${correctTrack.moodTags.join(", ")})
Guessed track: "${guessedTrack.title}" from ${guessedTrack.sourceName} (mood: ${guessedTrack.moodTags.join(", ")})
Shared mood qualities: ${sharedMoods.join(", ") || "none"}
Task: Write ONE short in-character reaction (max 30 words). If correct, celebrate with specific reference to the track's mood. If incorrect, explain briefly why the guessed track felt like a plausible trap by naming the shared mood quality, without being unkind. Return plain text only, no preamble.`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: 150, temperature: 0.8 },
  })
  return result.response.text().trim()
}
