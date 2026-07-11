export interface passionCard {
  id: string
  userId: string
  games: string[]
  anime: string[]
  artists: string[]
  aiProfileText: string
  recommendations: string[]
  cardImageUrl: string | null
  createdAt: Date
}
