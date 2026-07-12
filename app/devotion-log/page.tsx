"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import type { MediaType, JournalEntry } from "@/types/journal"

const MEDIA_TYPES: { type: MediaType; label: string; icon: string }[] = [
  { type: "ANIME", label: "Anime", icon: "movie" },
  { type: "GAME", label: "Game", icon: "sports_esports" },
  { type: "SONG", label: "Song", icon: "music_note" },
]

const MEDIA_COLORS: Record<MediaType, string> = {
  ANIME: "bg-secondary-container text-on-secondary-container",
  GAME: "bg-[#f08a5d]/20 text-[#f08a5d]",
  SONG: "bg-[#ffd166]/20 text-[#ffd166]",
}

const MOODS = ["😊", "😭", "🤯", "😡", "😴"] as const

const MEDIA_ICONS: Record<MediaType, string> = {
  ANIME: "movie",
  GAME: "sports_esports",
  SONG: "music_note",
}

export default function DevotionLogPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mediaType, setMediaType] = useState<MediaType>("ANIME")
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [mood, setMood] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/devotion-log/journal")
        const data = await res.json()
        if (!cancelled && res.ok) {
          setEntries(data.data)
        }
      } catch {
        // silent fail on load
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      recognitionRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setNote(transcript)
    }

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setVoiceSupported(true)

    return () => {
      recognition.abort()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setNote("") // Clear note before dictating
      recognitionRef.current.start()
      setIsListening(true)
    }
  }, [isListening])

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const response = await fetch("/api/devotion-log/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          title: title.trim(),
          note: note.trim() || null,
          mood,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save")
      }

      setSaved(true)
      setTitle("")
      setNote("")
      setMood(null)
      setEntries((prev) => [data.data, ...prev])
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/devotion-log/journal/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id))
      }
    } catch {
      // silent fail
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background text-on-background relative font-[family-name:var(--font-body)]">
      {/* Top App Bar */}
      <header className="flex justify-between items-center w-full px-5 h-16 bg-surface/90 backdrop-blur-sm fixed top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center">
            <span className="text-sm">⭐</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-on-surface">
            Good evening, Fan
          </h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-5 flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="relative -rotate-1 mb-4">
          <div className="washi-tape-accent bg-secondary/30" />
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-primary italic drop-shadow-md">
            Dear Journal...
          </h2>
          <p className="text-base text-on-surface-variant mt-2">
            What caught your heart today?
          </p>
        </div>

        {/* Media Type Selector */}
        <div className="flex gap-3 overflow-x-auto py-2 -mx-2 px-2">
          {MEDIA_TYPES.map((mt) => (
            <button
              key={mt.type}
              onClick={() => setMediaType(mt.type)}
              className={`shrink-0 px-4 py-2 rounded-full font-[family-name:var(--font-label)] text-xs font-semibold flex items-center gap-2 border transition-all active:scale-95 ${
                mediaType === mt.type
                  ? "bg-secondary-container text-on-secondary-container border-secondary/20 shadow-sm"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{mt.icon}</span>
              {mt.label}
            </button>
          ))}
        </div>

        {/* Inputs Card */}
        <div className="bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.2)] border-t-2 border-dashed border-outline-variant/20 relative mt-4 transform rotate-[0.5deg]">
          <div className="absolute right-4 top-4 opacity-10">
            <span className="material-symbols-outlined text-4xl">stylus_note</span>
          </div>
          <div className="flex flex-col gap-6">
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSave()}
                placeholder="Title of the obsession..."
                className="w-full bg-transparent border-0 border-b-2 border-outline-variant/50 focus:border-primary focus:ring-0 px-0 py-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-on-surface placeholder:text-outline-variant transition-colors outline-none"
              />
            </div>
            <div className="relative h-40">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write your thoughts here... How did it make you feel?"
                className="w-full h-full bg-transparent border-0 focus:ring-0 px-0 py-2 text-lg text-on-surface-variant placeholder:text-outline/50 resize-none dotted-line leading-loose outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mood Picker */}
        <div className="mt-2 flex flex-col gap-3">
          <span className="font-[family-name:var(--font-label)] text-xs font-semibold text-outline uppercase tracking-wider">
            Current Mood
          </span>
          <div className="flex gap-4 justify-between max-w-sm">
            {MOODS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setMood(mood === emoji ? null : emoji)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                  mood === emoji
                    ? "bg-secondary-container border-secondary scale-110"
                    : "bg-surface-container-highest border-outline-variant opacity-50 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-surface-variant"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Capture + Save */}
        <div className="mt-8 flex flex-col items-center gap-6">
          {voiceSupported === false ? (
            <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined text-3xl text-outline">mic_off</span>
              <span className="absolute -bottom-6 font-[family-name:var(--font-label)] text-xs text-outline whitespace-nowrap">
                Voice not supported
              </span>
            </div>
          ) : (
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 group relative ${
                isListening
                  ? "bg-error text-on-error animate-pulse"
                  : "bg-primary-container text-primary hover:bg-primary hover:text-on-primary"
              }`}
            >
              <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">
                {isListening ? "mic" : "mic"}
              </span>
              <span className={`absolute -bottom-6 font-[family-name:var(--font-label)] text-xs transition-colors whitespace-nowrap ${
                isListening ? "text-error" : "text-outline group-hover:text-primary"
              }`}>
                {isListening ? "Listening..." : "Voice Note"}
              </span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full mt-4 bg-primary text-on-primary text-lg font-medium py-4 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">favorite</span>
            {saving ? "Saving..." : saved ? "Saved!" : "Save to Memory"}
          </button>

          {error && (
            <p className="error text-sm text-center">{error}</p>
          )}
        </div>

        {/* Entries List */}
        <div className="mt-8 flex flex-col gap-4">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-on-surface">
            Past Memories
          </h3>

          {loading && (
            <p className="text-on-surface-variant text-sm">Loading entries...</p>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-on-surface-variant text-sm italic">No entries yet. Start journaling above!</p>
          )}

          {entries.map((entry) => (
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
                  </div>
                  <h4 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface truncate">
                    {entry.title}
                  </h4>
                  {entry.note && (
                    <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                      {entry.note}
                    </p>
                  )}
                  <p className="text-xs text-outline mt-2">
                    {formatDate(String(entry.createdAt))}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/30 text-on-surface-variant hover:text-error"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {deletingId === entry.id ? "hourglass_empty" : "delete"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="w-full h-20 flex justify-around items-center px-4">
          <button className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-lg px-4 py-1.5 -rotate-1 scale-110 transition-all duration-300 ease-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              edit_note
            </span>
            <span className="font-[family-name:var(--font-label)] text-xs mt-1">Journal</span>
          </button>
          <Link
            href="/devotion-log/timeline"
            className="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-secondary-fixed transition-colors"
          >
            <span className="material-symbols-outlined">auto_stories</span>
            <span className="font-[family-name:var(--font-label)] text-xs mt-1">Timeline</span>
          </Link>
          <Link
            href="/devotion-log/recap"
            className="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-secondary-fixed transition-colors"
          >
            <span className="material-symbols-outlined">subscriptions</span>
            <span className="font-[family-name:var(--font-label)] text-xs mt-1">Recap</span>
          </Link>
          <Link
            href="/passion-card"
            className="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-secondary-fixed transition-colors"
          >
            <span className="material-symbols-outlined">insights</span>
            <span className="font-[family-name:var(--font-label)] text-xs mt-1">Radar</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
