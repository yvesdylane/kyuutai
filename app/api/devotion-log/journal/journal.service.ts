import * as journalRepository from "./journal.repository"
import type {
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry,
} from "@/types/journal"

const VALID_MEDIA_TYPES = ["GAME", "ANIME", "SONG"] as const

function validateCreate(data: CreateJournalEntry): void {
  if (!data.userId) throw new Error("userId is required")
  if (!data.title) throw new Error("title is required")
  if (!data.mediaType || !VALID_MEDIA_TYPES.includes(data.mediaType)) {
    throw new Error(`mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`)
  }
}

function validateUpdate(data: UpdateJournalEntry): void {
  if (data.mediaType !== undefined && !VALID_MEDIA_TYPES.includes(data.mediaType)) {
    throw new Error(`mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`)
  }
  if (data.title !== undefined && !data.title) {
    throw new Error("title cannot be empty")
  }
}

export async function getJournalEntries(
  userId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<JournalEntry[]> {
  return journalRepository.findManyByUserId(userId, filters)
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  return journalRepository.findById(id)
}

export async function createJournalEntry(
  data: CreateJournalEntry
): Promise<JournalEntry> {
  validateCreate(data)
  return journalRepository.create(data)
}

export async function updateJournalEntry(
  id: string,
  data: UpdateJournalEntry
): Promise<JournalEntry | null> {
  validateUpdate(data)
  return journalRepository.update(id, data)
}

export async function deleteJournalEntry(
  id: string
): Promise<JournalEntry | null> {
  return journalRepository.remove(id)
}
