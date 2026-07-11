export type mediaType = "GAME" | "ANIME" | "SONG"
export type MediaType = mediaType

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

export type JournalEntry = journalEntry
export type CreateJournalEntry = Partial<Omit<journalEntry, "id" | "createdAt">>
export type UpdateJournalEntry = Partial<Omit<journalEntry, "id" | "createdAt">>
