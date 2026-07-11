"use client"

import { Particles } from "./particles"
import { FloatingNotes } from "./floating-notes"

export function AnimatedBackground() {
  return (
    <>
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 120px rgba(230,25,46,0.2)" }} />
      <Particles count={50} />
      <FloatingNotes count={14} />
    </>
  )
}
