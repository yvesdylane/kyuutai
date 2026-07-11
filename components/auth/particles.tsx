"use client"

import { useId } from "react"
import { motion } from "framer-motion"

interface Particle {
  id: number
  left: number
  top: number
  size: number
  duration: number
  delay: number
  startOpacity: number
  color: string
}

const COLORS = [
  "rgba(230,25,46,0.9)",
  "rgba(230,25,46,0.7)",
  "rgba(147,51,234,0.7)",
  "rgba(244,244,245,0.8)",
  "rgba(230,25,46,0.5)",
]

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 5,
    startOpacity: 0.1 + Math.random() * 0.3,
    color: COLORS[i % COLORS.length],
  }))
}

export function Particles({ count = 50 }: { count?: number }) {
  const uid = useId()
  const particles = generateParticles(count)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={`${uid}-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.startOpacity,
          }}
          animate={{
            y: [0, -20, -10, -30, 0],
            x: [0, 10, -10, 5, 0],
            opacity: [p.startOpacity, p.startOpacity * 0.6, p.startOpacity * 1.2, p.startOpacity * 0.8, p.startOpacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
