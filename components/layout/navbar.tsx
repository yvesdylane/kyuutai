"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const NAV_ITEMS = [
  { href: "/devotion-log", icon: "edit_note", label: "Journal", fillIcon: "edit_note" },
  { href: "/devotion-log/timeline", icon: "auto_stories", label: "Timeline", fillIcon: "auto_stories" },
  { href: "/devotion-log/recap", icon: "subscriptions", label: "Recap", fillIcon: "subscriptions" },
  { href: "/passion-card", icon: "insights", label: "Radar", fillIcon: "insights" },
  { href: "/ost-detective", icon: "music_note", label: "OST", fillIcon: "music_note" },
]

interface NavbarProps {
  title?: string
  showBack?: boolean
}

export function Navbar({ title, showBack = false }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  function isActive(href: string) {
    if (href === "/devotion-log") {
      return pathname === "/devotion-log"
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Top App Bar */}
      <header className="flex justify-between items-center w-full px-5 h-16 bg-surface/90 backdrop-blur-sm fixed top-0 z-40 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </button>
          ) : (
            <Link href="/devotion-log" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
              </div>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-on-surface hidden sm:block">Kyuutai</span>
            </Link>
          )}
          {title && (
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-on-surface lg:text-xl">
              {title}
            </h1>
          )}
        </div>

        {/* Desktop Nav — hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-lg" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {active ? item.fillIcon : item.icon}
                </span>
                <span className="font-[family-name:var(--font-label)]">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
          )}
        </button>
      </header>

      {/* Bottom Nav Bar — hidden on desktop */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.4)] border-t border-outline-variant/20 lg:hidden">
        <div className="w-full h-20 flex justify-around items-center px-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return active ? (
              <button
                key={item.href}
                className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-lg px-4 py-1.5 -rotate-1 scale-110 transition-all duration-300 ease-out"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {item.fillIcon}
                </span>
                <span className="font-[family-name:var(--font-label)] text-xs mt-1">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-secondary-fixed transition-colors"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-[family-name:var(--font-label)] text-xs mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
