export interface WeeklyRecap {
  id: string
  userId: string
  weekOf: string
  scriptText: string
  audioUrl: string
  sourceEntryIds: string[]
  createdAt: string
}

export interface GenerateRecapRequest {
  userId: string
}

export interface GenerateRecapResponse {
  data: WeeklyRecap
}
