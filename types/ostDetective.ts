export interface track {
  id: string
  title: string
  sourceName: string
  sourceType: "GAME" | "ANIME" | "SONG"
  clipUrl: string
  durationSec: number
  moodTags: string[]
  youtubeUrl: string | null
  createdAt: string
}

export interface gameRound {
  id: string
  sessionId: string
  trackId: string
  clipUrl: string
  questionText: string | null
  options: { id: string; title: string; sourceName: string }[]
  correctId: string
  userAnswerId: string | null
  isCorrect: boolean | null
  narratorLine: string | null
  narratorAudioUrl: string | null
  status: "pending" | "ready" | "answered"
  roundIndex: number
  answeredAt: string | null
  createdAt: string
}

export interface gameSession {
  id: string
  userId: string
  score: number
  streak: number
  mode: string
  createdAt: string
}

export interface startSessionResponse {
  sessionId: string
  round: gameRound
}

export interface answerRoundResponse {
  isCorrect: boolean
  narratorLine: string
  narratorAudioUrl: string
  updatedStreak: number
  updatedScore: number
}
