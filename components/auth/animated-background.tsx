"use client"

import { Particles } from "./particles"
import { FloatingNotes } from "./floating-notes"

export function AnimatedBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 120px rgba(220,38,38,0.25)" }} />
      <Particles count={50} />
      <FloatingNotes count={14} />
    </>
  )
}
