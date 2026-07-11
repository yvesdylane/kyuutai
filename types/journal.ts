export type mediaType = "GAME" | "ANIME" | "SONG"

export interface journalEntry {
  id: string
  userId: string
  date: Date
  mediaType: mediaType
  title: string
  note: string | null
  voiceTranscript: string | null
  mood: string | null
  createdAt: Date
}
