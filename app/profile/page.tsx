"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import type { PassionCard } from "@/types/passion-card"

interface UserProfile {
  id: string
  name: string
  email: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [passionCard, setPassionCard] = useState<PassionCard | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in")
    }
  }, [status, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileRes, cardRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/passion-card"),
        ])

        const profileData = await profileRes.json()
        const cardData = await cardRes.json()

        if (!cancelled && profileRes.ok) {
          setProfile(profileData.data)
          setName(profileData.data.name)
          setEmail(profileData.data.email)
        }

        if (!cancelled && cardRes.ok && cardData.data) {
          setPassionCard(cardData.data)
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image must be less than 5MB")
      return
    }

    setUploadingImage(true)
    setProfileError(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setProfile(data.data)
      await updateSession({ image: data.data.imageUrl })
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      setProfileError("Username is required")
      return
    }

    setSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(false)

    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("email", email.trim())

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setProfile(data.data)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSavePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordError("All password fields are required")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const res = await fetch("/api/user/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        <Navbar title="Profile" showBack />
        <main className="pt-24 pb-32 px-5 max-w-2xl lg:max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar title="Profile" showBack />
      <main className="pt-24 pb-32 px-5 max-w-2xl lg:max-w-4xl mx-auto">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-28 h-28 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {profile?.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">person</span>
              )}
            </button>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              {uploadingImage ? (
                <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-white">photo_camera</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-on-surface-variant mt-3">Click to change photo</p>
        </div>

        {/* Username & Email */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface mb-4">
            Account Details
          </h2>
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
            </div>
            {profileError && (
              <p className="text-sm text-error">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-400">Profile updated!</p>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {/* AI Summary */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface mb-4">
            Your Fandom Persona
          </h2>
          {passionCard ? (
            <div className="bg-surface-container rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-primary">
                  {passionCard.archetype}
                </h3>
              </div>
              <p className="text-on-surface-variant leading-relaxed mb-4">
                &ldquo;{passionCard.blurb}&rdquo;
              </p>
              <div className="flex flex-wrap gap-2">
                {passionCard.games.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#f08a5d]">sports_esports</span>
                    <span className="text-sm text-on-surface-variant">{passionCard.games.join(", ")}</span>
                  </div>
                )}
                {passionCard.anime.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#02a9ff]">movie</span>
                    <span className="text-sm text-on-surface-variant">{passionCard.anime.join(", ")}</span>
                  </div>
                )}
                {passionCard.artists.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#1DB954]">music_note</span>
                    <span className="text-sm text-on-surface-variant">{passionCard.artists.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container rounded-xl p-5 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">insights</span>
              <p className="text-on-surface-variant mb-3">Generate your Passion Card first to see your AI summary!</p>
              <button
                onClick={() => router.push("/passion-card")}
                className="px-6 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-medium hover:opacity-90 transition-opacity"
              >
                Create Passion Card
              </button>
            </div>
          )}
        </section>

        {/* Password Change */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface mb-4">
            Change Password
          </h2>
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-error">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-400">Password updated!</p>
            )}
            <button
              onClick={handleSavePassword}
              disabled={savingPassword}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
