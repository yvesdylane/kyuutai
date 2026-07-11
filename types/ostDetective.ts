export interface clipGuess {
  clipId: string
  guess: string
  correct: boolean
}

export interface gameSession {
  id: string
  userId: string
  score: number
  streak: number
  mode: string
  clipsPlayed: clipGuess[]
  createdAt: Date
}
