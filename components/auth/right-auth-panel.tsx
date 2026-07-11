"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
}

export function RightAuthPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="flex h-full w-full items-center justify-center px-6 py-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        className="w-full"
        style={{ maxWidth: "480px" }}
      >
        <div
          style={{
            background: "rgba(26,26,28,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "32px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
          className="p-12"
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}
