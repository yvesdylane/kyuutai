export interface RadarAxis {
  axis: string
  score: number
}

export interface Recommendation {
  title: string
  category: "game" | "anime" | "artist" | "song"
  reason: string
}

export interface PassionCard {
  id: string
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
  radarAxes: RadarAxis[]
  archetype: string
  blurb: string
  audioUrl: string | null
  obsessionId: string | null
  recommendations: Recommendation[]
  createdAt: string
  updatedAt: string
}

export interface GeneratePassionCardRequest {
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
}
