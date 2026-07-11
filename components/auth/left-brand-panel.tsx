"use client"

import { motion } from "framer-motion"
import { AnimatedBackground } from "./animated-background"

function ShurikenIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 4L27.5 17.5L40 24L27.5 30.5L24 44L20.5 30.5L8 24L20.5 17.5L24 4Z"
        fill="#E6192E"
        opacity="0.9"
      />
      <circle cx="24" cy="24" r="4" fill="#1A1A1C" />
    </svg>
  )
}

export function LeftBrandPanel() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/auth-bg.png)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(26,26,28,0.35)] to-[rgba(26,26,28,0.7)]" />
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-6 w-full"
        style={{
          maxWidth: "420px",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "32px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          padding: "48px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6"
        >
          <ShurikenIcon />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-5xl font-bold tracking-tight text-white"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
        >
          Kyuutai
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-2 text-base"
          style={{ color: "#E6192E", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
        >
          音楽・アニメ・ゲーム・情熱
        </motion.p>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1.1,
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          One platform.
          <br />
          All your passions.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-4"
          style={{
            color: "rgba(244,244,245,0.95)",
            fontSize: "1.15rem",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            lineHeight: 1.6,
          }}
        >
          Log your devotion.
          <br />
          Celebrate your fandom.
          <br />
          Connect with your people.
        </motion.p>
      </motion.div>
    </div>
  )
}
