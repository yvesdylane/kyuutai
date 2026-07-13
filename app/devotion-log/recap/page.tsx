"use client"

import { useState, useEffect, useRef } from "react"
import type { WeeklyRecap } from "@/types/recap"
import { Navbar } from "@/components/layout/navbar"

export default function RecapPage() {
  const [recaps, setRecaps] = useState<WeeklyRecap[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/devotion-log/recap")
        const data = await res.json()
        if (!cancelled && res.ok) {
          setRecaps(data.data)
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

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/devotion-log/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate recap")
      }

      setRecaps((prev) => {
        const exists = prev.some((r) => r.id === data.data.id)
        if (exists) return prev
        return [data.data, ...prev]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  function togglePlay(recap: WeeklyRecap) {
    if (playingId === recap.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(recap.audioUrl)
      audio.onended = () => setPlayingId(null)
      audioRef.current = audio
      audio.play()
      setPlayingId(recap.id)
    }
  }

  function formatWeekOf(dateStr: string) {
    const monday = new Date(dateStr)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    const format = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    return `${format(monday)} – ${format(sunday)}`
  }

  return (
    <div className="min-h-screen bg-background text-on-background relative font-[family-name:var(--font-body)]">
      <Navbar title="Weekly Recap" showBack />

      {/* Main Content */}
      <main className="pt-24 pb-32 px-5 max-w-2xl lg:max-w-4xl mx-auto">
        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full mb-8 bg-primary text-on-primary text-lg font-medium py-4 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">
            {generating ? "hourglass_empty" : "auto_stories"}
          </span>
          {generating ? "Generating recap..." : "Generate Weekly Recap"}
        </button>

        {error && (
          <p className="error text-sm text-center mb-6">{error}</p>
        )}

        {/* Recaps List */}
        {loading && (
          <p className="text-on-surface-variant text-sm text-center py-8">Loading recaps...</p>
        )}

        {!loading && recaps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="material-symbols-outlined text-6xl text-outline-variant">subscriptions</span>
            <p className="text-on-surface-variant text-center">
              No recaps yet. Generate your first weekly recap!
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {recaps.map((recap) => (
            <div
              key={recap.id}
              className="bg-surface-container-low rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-outline-variant/10"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
                  {formatWeekOf(recap.weekOf)}
                </h3>
                <span className="text-xs text-outline font-[family-name:var(--font-label)]">
                  {recap.sourceEntryIds?.length ?? 0} entries
                </span>
              </div>

              {/* Audio Player */}
              <button
                onClick={() => togglePlay(recap)}
                className="w-full flex items-center gap-3 bg-surface-container-highest rounded-lg px-4 py-3 hover:bg-surface-variant transition-colors"
              >
                <span className={`material-symbols-outlined text-2xl ${
                  playingId === recap.id ? "text-primary" : "text-on-surface-variant"
                }`}>
                  {playingId === recap.id ? "pause_circle" : "play_circle"}
                </span>
                <span className="font-[family-name:var(--font-label)] text-sm text-on-surface-variant">
                  {playingId === recap.id ? "Playing..." : "Listen to recap"}
                </span>
              </button>

              {/* Script Toggle */}
              <button
                onClick={() => setExpandedId(expandedId === recap.id ? null : recap.id)}
                className="w-full flex items-center justify-between mt-3 px-2 py-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="font-[family-name:var(--font-label)]">
                  {expandedId === recap.id ? "Hide script" : "Show script"}
                </span>
                <span className="material-symbols-outlined text-[18px]">
                  {expandedId === recap.id ? "expand_less" : "expand_more"}
                </span>
              </button>

              {expandedId === recap.id && (
                <div className="mt-2 p-4 bg-surface-container-highest rounded-lg">
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {recap.scriptText}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
