"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface musicPlayerProps {
  src: string
  autoPlay?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

export function MusicPlayer({ src, autoPlay = false, onPlay, onPause, onEnded }: musicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  const barPattern = [
    { min: 6, max: 28 }, { min: 10, max: 20 }, { min: 4, max: 24 },
    { min: 12, max: 28 }, { min: 8, max: 18 }, { min: 6, max: 26 },
    { min: 14, max: 22 }, { min: 4, max: 20 }, { min: 10, max: 28 },
    { min: 8, max: 16 }, { min: 6, max: 24 }, { min: 12, max: 20 },
  ]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoaded(true)
    }
    const onPlayEvent = () => { setIsPlaying(true); onPlay?.() }
    const onPauseEvent = () => { setIsPlaying(false); onPause?.() }
    const onEndedEvent = () => { setIsPlaying(false); onEnded?.() }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("play", onPlayEvent)
    audio.addEventListener("pause", onPauseEvent)
    audio.addEventListener("ended", onEndedEvent)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("play", onPlayEvent)
      audio.removeEventListener("pause", onPauseEvent)
      audio.removeEventListener("ended", onEndedEvent)
    }
  }, [onPlay, onPause, onEnded])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = src
    audio.load()
    setIsLoaded(false)
    setCurrentTime(0)
    setDuration(0)
    if (autoPlay) {
      audio.play().catch(() => {})
    }
  }, [src, autoPlay])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [isPlaying])

  const replay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
    audio.play().catch(() => {})
  }, [])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    audio.currentTime = percent * duration
    setCurrentTime(audio.currentTime)
  }, [duration])

  const formatTime = (t: number) => {
    const s = Math.floor(t)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-surface-container rounded-2xl p-5">
      <audio ref={audioRef} preload="metadata" />

      {/* Equalizer Animation */}
      <div className="flex items-end justify-center gap-1 h-12 mb-4">
        {barPattern.map((bar, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full transition-all duration-150"
            style={{
              height: isPlaying
                ? `${(bar.min + bar.max) / 2}px`
                : "4px",
              backgroundColor: isPlaying
                ? `hsl(${350 + i * 3}, 85%, ${55 + (i % 3) * 5}%)`
                : "hsl(0, 0%, 30%)",
              animationName: isPlaying ? "equalizer" : "none",
              animationDuration: `${0.3 + (i % 4) * 0.1}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div
        className="relative h-2 bg-outline/20 rounded-full cursor-pointer mb-3 group"
        onClick={seek}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
      </div>

      {/* Time + Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant font-mono tabular-nums">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center gap-2">
          {/* Replay */}
          <button
            onClick={replay}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
            aria-label="Replay"
          >
            <span className="material-symbols-outlined text-xl">replay</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>

          {/* 10s skip */}
          <button
            onClick={() => {
              const audio = audioRef.current
              if (audio) audio.currentTime = Math.min(audio.currentTime + 10, duration)
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
            aria-label="Forward 10 seconds"
          >
            <span className="material-symbols-outlined text-xl">forward_10</span>
          </button>
        </div>

        <span className="text-xs text-on-surface-variant font-mono tabular-nums">
          {duration > 0 ? formatTime(duration) : "0:00"}
        </span>
      </div>
    </div>
  )
}
