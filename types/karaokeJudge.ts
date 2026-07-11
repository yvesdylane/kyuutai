export interface karaokeAttempt {
  id: string
  userId: string
  audioUrl: string
  targetSong: string
  aiScore: number
  roastText: string
  roastAudioUrl: string
  createdAt: Date
}
