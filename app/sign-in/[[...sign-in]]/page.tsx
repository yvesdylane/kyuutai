"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/devotion-log")
        router.refresh()
      }
    } catch {
      setError("Sign in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#F4F4F5]">
              Welcome back
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Sign in to continue your fandom devotion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F4F4F5] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#2D2D30] border border-white/10 text-[#F4F4F5] placeholder:text-[#F4F4F5]/50 outline-none focus:border-[#E6192E] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-[#F87171]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E6192E] text-white font-semibold text-base hover:bg-[#b91c1c] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#A1A1AA]">
            Don&apos;t have an account?{" "}
            <Link href="/" className="text-[#E6192E] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
