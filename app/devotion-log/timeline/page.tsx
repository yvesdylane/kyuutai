"use client"

import { useState, useEffect } from "react"
import type { JournalEntry, MediaType } from "@/types/journal"
import { Navbar } from "@/components/layout/navbar"

const MEDIA_COLORS: Record<MediaType, string> = {
  ANIME: "bg-secondary-container text-on-secondary-container",
  GAME: "bg-[#f08a5d]/20 text-[#f08a5d]",
  SONG: "bg-[#ffd166]/20 text-[#ffd166]",
}

const MEDIA_ICONS: Record<MediaType, string> = {
  ANIME: "movie",
  GAME: "sports_esports",
  SONG: "music_note",
}

interface DateGroup {
  label: string
  entries: JournalEntry[]
}

function groupByDate(entries: JournalEntry[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups = new Map<string, JournalEntry[]>()

  for (const entry of entries) {
    const d = new Date(entry.date)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const key = day.toISOString()

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(entry)
  }

  const result: DateGroup[] = []
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

  for (const key of sortedKeys) {
    const day = new Date(key)
    let label: string

    if (day.getTime() === today.getTime()) {
      label = "Today"
    } else if (day.getTime() === yesterday.getTime()) {
      label = "Yesterday"
    } else {
      label = day.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    }

    result.push({ label, entries: groups.get(key)! })
  }

  return result
}

function formatTime(dateStr: string | Date) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function TimelinePage() {
  const [groups, setGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/devotion-log/journal")
        const data = await res.json()
        if (!cancelled && res.ok) {
          setGroups(groupByDate(data.data))
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-background text-on-background relative font-[family-name:var(--font-body)]">
      <Navbar title="Passion Timeline" showBack />

      {/* Main Content */}
      <main className="pt-24 pb-32 px-5 max-w-2xl lg:max-w-4xl mx-auto">
        {loading && (
          <p className="text-on-surface-variant text-sm text-center py-8">Loading timeline...</p>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="material-symbols-outlined text-6xl text-outline-variant">auto_stories</span>
            <p className="text-on-surface-variant text-center">
              No entries yet. Start journaling to build your timeline!
            </p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-outline-variant/30" />

            <div className="flex flex-col gap-8">
              {groups.map((group) => (
                <div key={group.label} className="relative">
                  {/* Date label */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center z-10">
                      <span className="material-symbols-outlined text-on-secondary-container text-lg">
                        calendar_today
                      </span>
                    </div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
                      {group.label}
                    </h2>
                    <span className="text-xs text-outline font-[family-name:var(--font-label)]">
                      {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Entries for this date */}
                  <div className="flex flex-col gap-3 ml-12">
                    {group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-surface-container-low rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-outline-variant/10 relative group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${MEDIA_COLORS[entry.mediaType]}`}>
                                <span className="material-symbols-outlined text-[14px]">{MEDIA_ICONS[entry.mediaType]}</span>
                                {entry.mediaType}
                              </span>
                              {entry.mood && (
                                <span className="text-lg">{entry.mood}</span>
                              )}
                              <span className="text-xs text-outline ml-auto">
                                {formatTime(entry.date)}
                              </span>
                            </div>
                            <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-on-surface truncate">
                              {entry.title}
                            </h3>
                            {entry.note && (
                              <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                                {entry.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
