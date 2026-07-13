"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/devotion-log")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <SplitAuthLayout>
        <RightAuthPanel>
          <div className="flex items-center justify-center h-64">
            <p className="text-on-surface-variant">Loading...</p>
          </div>
        </RightAuthPanel>
      </SplitAuthLayout>
    )
  }

  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-on-background">
              Welcome to Kyuutai
            </h1>
            <p className="text-on-surface-variant mt-2">
              Your fandom, quantified. Start your devotion journey today.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/sign-up"
              className="w-full py-3 rounded-xl bg-secondary text-white font-semibold text-base text-center hover:bg-secondary/80 active:scale-[0.98] transition-all"
            >
              Get Started
            </Link>

            <Link
              href="/sign-in"
              className="w-full py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-background font-medium text-center hover:bg-surface-container-highest transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
