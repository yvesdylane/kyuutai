"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function Home() {
  const { data: session, status } = useSession()
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
            <p className="text-[#A1A1AA]">Loading...</p>
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
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F4F4F5]">
              Welcome to Kyuutai
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Your fandom, quantified. Start your devotion journey today.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/sign-up"
              className="w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold text-base text-center hover:bg-[#b91c1c] active:scale-[0.98] transition-all"
            >
              Get Started
            </Link>

            <Link
              href="/sign-in"
              className="w-full py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] font-medium text-center hover:bg-[#3F3F46] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
