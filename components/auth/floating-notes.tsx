"use client"

import { useId } from "react"
import { motion } from "framer-motion"

interface Note {
  id: number
  note: string
  left: number
  size: number
  duration: number
  delay: number
  startOpacity: number
  rotation: number
}

const NOTES = ["♪", "♫", "♬", "♩"]

function generateNotes(count: number): Note[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    note: NOTES[i % NOTES.length],
    left: 5 + Math.random() * 90,
    size: 16 + Math.random() * 32,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 8,
    startOpacity: 0.15 + Math.random() * 0.25,
    rotation: Math.random() * 360,
  }))
}

export function FloatingNotes({ count = 14 }: { count?: number }) {
  const uid = useId()
  const notes = generateNotes(count)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {notes.map((n) => (
        <motion.div
          key={`${uid}-${n.id}`}
          className="absolute"
          style={{
            left: `${n.left}%`,
            fontSize: `${n.size}px`,
            color: "rgba(230,25,46,0.9)",
            textShadow: "0 0 12px rgba(230,25,46,0.4)",
          }}
          initial={{ y: "110%", opacity: 0, rotate: n.rotation }}
          animate={{
            y: "-110vh",
            opacity: [0, n.startOpacity, n.startOpacity * 0.8, 0],
            rotate: n.rotation + 360,
          }}
          transition={{
            duration: n.duration,
            delay: n.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {n.note}
        </motion.div>
      ))}
    </div>
  )
}
