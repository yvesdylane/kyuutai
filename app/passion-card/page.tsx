"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { toPng } from "html-to-image"
import type { PassionCard } from "@/types/passion-card"

type Category = "games" | "anime" | "artists"

const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; placeholder: string; color: string }> = {
  games: { label: "Top Games", icon: "sports_esports", placeholder: "e.g. Elden Ring, Celeste, Hades...", color: "text-primary" },
  anime: { label: "Top Anime", icon: "movie", placeholder: "e.g. Mushishi, Evangelion, Spy x Family...", color: "text-[#02a9ff]" },
  artists: { label: "Favorite Artists", icon: "music_note", placeholder: "e.g. Explosions in the Sky, Radiohead...", color: "text-[#1DB954]" },
}

function TagInput({ category, tags, onChange }: { category: Category; tags: string[]; onChange: (tags: string[]) => void }) {
  const config = CATEGORY_CONFIG[category]
  const [input, setInput] = useState("")

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput("")
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-on-surface">{config.label}</span>
        <span className="text-xs text-on-surface-variant">({tags.length})</span>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 min-h-[52px]">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-error transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? config.placeholder : "Add more..."}
          className="flex-1 min-w-[120px] bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant/50 text-sm"
        />
      </div>
    </div>
  )
}

export default function PassionCardPage() {
  const [card, setCard] = useState<PassionCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [games, setGames] = useState<string[]>([])
  const [anime, setAnime] = useState<string[]>([])
  const [artists, setArtists] = useState<string[]>([])
  const radarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/passion-card")
        const data = await res.json()
        if (!cancelled && res.ok && data.data) {
          setCard(data.data)
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
      const res = await fetch("/api/passion-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games, anime, artists }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate")
      setCard(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    if (!radarRef.current) return
    try {
      const dataUrl = await toPng(radarRef.current, { backgroundColor: "#141314" })
      const link = document.createElement("a")
      link.download = "passion-radar.png"
      link.href = dataUrl
      link.click()
    } catch {
      // silent
    }
  }

  const canGenerate = games.length > 0 && anime.length > 0 && artists.length > 0

  return (
    <div className="min-h-screen bg-background text-on-background relative font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-5 h-16 bg-surface/90 backdrop-blur-sm fixed top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-on-surface">
            Passion Card
          </h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        ) : card ? (
          /* Result View */
          <div className="space-y-4">
            {/* Radar Chart */}
            <section ref={radarRef} className="relative bg-surface-container-low rounded-xl p-6 paper-grain shadow-xl border border-outline-variant/20 transform rotate-1">
              <div className="washi-tape absolute -top-3 left-1/2 -translate-x-1/2" />
              <div className="flex flex-col items-center">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary mb-4 self-start">Passion Radar</h2>
                <div className="relative w-full aspect-square flex items-center justify-center max-w-[300px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {/* Grid */}
                    <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                    <polygon points="50,20 80,37 80,63 50,80 20,63 20,37" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                    <polygon points="50,35 65,43 65,57 50,65 35,57 35,43" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant opacity-30" />
                    {/* Axes */}
                    {[0, 60, 120, 180, 240, 300].map((angleDeg, i) => {
                      const rad = (angleDeg - 90) * (Math.PI / 180)
                      const x2 = 50 + 45 * Math.cos(rad)
                      const y2 = 50 + 45 * Math.sin(rad)
                      return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.3" className="text-outline-variant opacity-20" />
                    })}
                    {/* Data polygon */}
                    {card.radarAxes.length === 6 && (() => {
                      const points = card.radarAxes.map((a, i) => {
                        const angle = (i * 60 - 90) * (Math.PI / 180)
                        const r = (a.score / 100) * 45
                        return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`
                      }).join(" ")
                      return <polygon points={points} fill="rgba(203, 190, 255, 0.4)" stroke="#cbbeff" strokeWidth="2" className="radar-data-polygon" />
                    })()}
                  </svg>
                  {/* Labels */}
                  {card.radarAxes.map((a, i) => {
                    const angle = (i * 60 - 90) * (Math.PI / 180)
                    const x = 50 + 55 * Math.cos(angle)
                    const y = 50 + 55 * Math.sin(angle)
                    return (
                      <span
                        key={i}
                        className="absolute font-[family-name:var(--font-label)] text-[10px] text-on-surface-variant -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        {a.axis}
                      </span>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Personality Blurb */}
            <section className="bg-surface-container-high rounded-xl p-6 paper-grain shadow-xl border border-outline-variant/30 transform -rotate-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-label)] text-[10px] text-tertiary-fixed uppercase tracking-widest mb-1">Archetype</span>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-primary">{card.archetype}</h3>
                </div>
              </div>
              <div className="dotted-line my-4" />
              <p className="font-[family-name:var(--font-body)] text-on-surface leading-relaxed italic mb-4">
                &ldquo;{card.blurb}&rdquo;
              </p>
              {card.audioUrl && (
                <button
                  onClick={() => {
                    const audio = new Audio(card.audioUrl!)
                    audio.play()
                  }}
                  className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-3 rounded-lg w-full justify-center border border-primary/20 hover:bg-surface-container-highest transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined">campaign</span>
                  <span className="font-[family-name:var(--font-body)] font-bold">Play Voice Profile</span>
                </button>
              )}
            </section>

            {/* Your Favorites */}
            <section className="bg-surface-container p-6 rounded-xl border border-dotted border-outline-variant relative overflow-hidden">
              <h4 className="font-[family-name:var(--font-display)] text-lg font-semibold text-primary mb-4">Your Favorites</h4>
              <div className="space-y-3">
                {(["games", "anime", "artists"] as Category[]).map((cat) => {
                  const items = card[cat]
                  const config = CATEGORY_CONFIG[cat]
                  return items.length > 0 && (
                    <div key={cat} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/10">
                      <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item) => (
                          <span key={item} className="bg-surface-container-highest text-on-surface px-2 py-0.5 rounded text-xs">{item}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
                <span className="material-symbols-outlined text-[120px]">hub</span>
              </div>
            </section>

            {/* Actions */}
            <button
              onClick={() => { setCard(null) }}
              className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl hover:bg-surface-container transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container py-3 rounded-xl hover:bg-secondary-container/80 transition-colors"
            >
              <span className="material-symbols-outlined">download</span>
              Download Card
            </button>
          </div>
        ) : (
          /* Input Form */
          <div className="space-y-6">
            <p className="text-on-surface-variant text-sm">
              Enter your top favorites and let AI discover your emotional through-line.
            </p>

            <TagInput category="games" tags={games} onChange={setGames} />
            <TagInput category="anime" tags={anime} onChange={setAnime} />
            <TagInput category="artists" tags={artists} onChange={setArtists} />

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="w-full bg-primary text-on-primary text-lg font-medium py-4 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Analyzing your taste universe...
                </span>
              ) : (
                "Generate My Radar"
              )}
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-container/90 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.4)] rounded-t-xl flex justify-around items-center px-4 pb-6 pt-3">
        <Link href="/devotion-log" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">edit_note</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Journal</span>
        </Link>
        <Link href="/devotion-log/timeline" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">auto_stories</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Timeline</span>
        </Link>
        <Link href="/devotion-log/recap" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">graphic_eq</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Recap</span>
        </Link>
        <div className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          <span className="font-[family-name:var(--font-label)] text-xs">Radar</span>
        </div>
      </nav>
    </div>
  )
}
