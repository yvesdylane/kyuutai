"use client"

import { useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MusicPlayer } from "@/components/ui/music-player"
import { Navbar } from "@/components/layout/navbar"
import type { gameRound, gameSession } from "@/types/ostDetective"

export default function OstDetectivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [gameSession, setGameSession] = useState<gameSession | null>(null)
  const [currentRound, setCurrentRound] = useState<gameRound | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [narratorText, setNarratorText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [summary, setSummary] = useState<{ session: gameSession; rounds: gameRound[] } | null>(null)
  const isSubmitting = useRef(false)

  const startGame = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ost-detective/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "classic" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGameSession({ id: data.data.sessionId, userId: "", score: 0, streak: 0, mode: "classic", createdAt: "" })
      setCurrentRound(data.data.round)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitAnswer = useCallback(async (answerId: string) => {
    if (!currentRound || selectedAnswer || isSubmitting.current) return
    isSubmitting.current = true
    setSelectedAnswer(answerId)
    setShowResult(true)

    try {
      const res = await fetch(`/api/ost-detective/round/${currentRound.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_answer_id: answerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNarratorText(data.data.narratorLine)
      setGameSession(prev => prev ? { ...prev, score: data.data.updatedScore, streak: data.data.updatedStreak } : prev)
    } catch (err) {
      console.error(err)
    }
  }, [currentRound, selectedAnswer])

  const nextRound = useCallback(async () => {
    if (!gameSession) return
    setLoading(true)
    try {
      let retries = 0
      while (retries < 20) {
        const res = await fetch(`/api/ost-detective/round/next?sessionId=${gameSession.id}`)
        const data = await res.json()
        if (data.data.status === "pending") {
          await new Promise(r => setTimeout(r, 500))
          retries++
          continue
        }
        setCurrentRound(data.data)
        setSelectedAnswer(null)
        setShowResult(false)
        setNarratorText(null)
        isSubmitting.current = false
        break
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [gameSession])

  const endGame = useCallback(async () => {
    if (!gameSession) return
    const res = await fetch(`/api/ost-detective/session/${gameSession.id}/summary`)
    const data = await res.json()
    setSummary(data.data)
    setGameOver(true)
  }, [gameSession])

  if (status === "loading") return <div className="p-8 text-on-background">Loading...</div>
  if (!session) { router.push("/sign-in"); return null }

  if (gameOver && summary) {
    const correct = summary.rounds.filter(r => r.isCorrect).length
    return (
      <div className="min-h-screen bg-background text-on-background p-8">
        <Navbar title="OST Detective" showBack />
        <div className="max-w-2xl mx-auto pt-24">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-6">Game Over!</h1>
          <div className="bg-surface-container rounded-2xl p-6 mb-6">
            <p className="text-2xl font-bold">Score: {summary.session.score}</p>
            <p className="text-lg text-on-surface-variant">Best Streak: {summary.session.streak}</p>
            <p className="text-on-surface-variant">{correct}/{summary.rounds.length} correct</p>
          </div>
          <div className="space-y-3">
            {summary.rounds.map((round, i) => (
              <div key={round.id} className={`p-4 rounded-xl ${round.isCorrect ? "bg-green-900/30" : "bg-red-900/30"}`}>
                <p className="font-medium">Round {i + 1}: {round.isCorrect ? "Correct" : "Wrong"}</p>
                {round.narratorLine && <p className="text-sm text-on-surface-variant mt-1">{round.narratorLine}</p>}
              </div>
            ))}
          </div>
          <button onClick={() => { setGameOver(false); setSummary(null); setGameSession(null); setCurrentRound(null); isSubmitting.current = false }}
            className="mt-6 w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold">
            Play Again
          </button>
        </div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <Navbar title="OST Detective" showBack />
        <div className="text-center pt-16">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold mb-4">OST Detective</h1>
          <p className="text-on-surface-variant mb-8">Guess the source of game & anime soundtracks</p>
          <button onClick={startGame} disabled={loading}
            className="px-8 py-4 rounded-xl bg-[#E6192E] text-white font-semibold text-lg hover:bg-[#b91c1c] disabled:opacity-50">
            {loading ? "Starting..." : "Start Game"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar title="OST Detective" showBack />
      <div className="max-w-2xl lg:max-w-4xl mx-auto pt-24 pb-32 px-4">
        {/* Score Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-on-surface-variant">Score</p>
            <p className="text-2xl font-bold">{gameSession.score}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-on-surface-variant">Round</p>
            <p className="text-2xl font-bold">{currentRound?.roundIndex}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-on-surface-variant">Streak</p>
            <p className="text-2xl font-bold">{gameSession.streak}</p>
          </div>
        </div>

        {currentRound && (
          <>
            {/* Question */}
            <div className="bg-surface-container rounded-2xl p-6 mb-6">
              <p className="text-xl font-medium">{currentRound.questionText}</p>
            </div>

            {/* Music Player */}
            <div className="mb-6">
              <MusicPlayer
                src={currentRound.clipUrl}
                autoPlay={true}
              />
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentRound.options.map(option => (
                <button key={option.id} onClick={() => submitAnswer(option.id)}
                  disabled={!!selectedAnswer}
                  className={`p-4 rounded-xl text-left transition-all ${
                    selectedAnswer === option.id
                      ? option.id === currentRound.correctId
                        ? "bg-green-900/50 border-2 border-green-500"
                        : "bg-red-900/50 border-2 border-red-500"
                      : showResult && option.id === currentRound.correctId
                        ? "bg-green-900/30 border-2 border-green-500"
                        : "bg-surface-container hover:bg-surface-container-high border-2 border-transparent"
                  }`}>
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-on-surface-variant">{option.sourceName}</p>
                </button>
              ))}
            </div>

            {/* Narrator Reaction */}
            {showResult && narratorText && (
              <div className="bg-surface-container rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">record_voice_over</span>
                  <p className="text-on-surface-variant font-medium">Narrator</p>
                </div>
                <p className="text-lg">{narratorText}</p>
              </div>
            )}

            {/* Action Buttons */}
            {showResult && (
              <div className="flex gap-3">
                <button onClick={nextRound} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#E6192E] text-white font-semibold disabled:opacity-50">
                  {loading ? "Loading..." : "Next Round"}
                </button>
                <button onClick={endGame}
                  className="px-6 py-3 rounded-xl bg-surface-container text-on-surface font-medium">
                  End Game
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
