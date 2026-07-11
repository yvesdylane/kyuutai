export interface timelineItem {
  id: string
  userId: string
  date: Date
  mediaType: "GAME" | "ANIME" | "SONG"
  title: string
  note: string | null
  mood: string | null
  createdAt: Date
  weekLabel: string
}
